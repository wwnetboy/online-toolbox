const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const config = require('../config');
const { User, Role, RefreshToken } = require('../models');

/**
 * Authentication Service
 * Handles login validation, JWT token generation, and refresh token logic
 * Requirements: 1.1, 1.5, 1.6
 */
class AuthService {
  /**
   * Hash password using bcrypt
   * Requirement: 1.5
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   * Requirement: 1.5
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access token
   * @param {Object} user - User object
   * @param {Array} roles - User roles
   * @returns {string} JWT access token
   */
  static generateAccessToken(user, roles = []) {
    const payload = {
      userId: user.id,
      userName: user.userName,
      roles: roles.map(r => r.roleCode || r),
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Generate refresh token
   * @param {Object} user - User object
   * @returns {string} JWT refresh token
   */
  static generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: 'refresh',
    };

    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  /**
   * Calculate token expiration date
   * @param {string} expiresIn - Expiration string (e.g., '7d', '1h')
   * @returns {Date} Expiration date
   */
  static calculateExpirationDate(expiresIn) {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      // Default to 7 days if format is invalid
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  static async register(userData) {
    const { userName, email, password, nickName, phone, gender } = userData;

    // Check if username already exists
    const existingUser = await User.findOne({
      where: { userName }
    });

    if (existingUser) {
      return {
        success: false,
        error: 'USERNAME_EXISTS',
        message: '用户名已存在',
      };
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await User.findOne({
        where: { email }
      });

      if (existingEmail) {
        return {
          success: false,
          error: 'EMAIL_EXISTS',
          message: '邮箱已被注册',
        };
      }
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user with default role (user)
    const user = await User.create({
      userName,
      email,
      password: hashedPassword,
      nickName: nickName || userName,
      phone,
      gender: gender || 'unknown',
      status: 'active',
    });

    // Assign default user role
    const defaultRole = await Role.findOne({
      where: { roleCode: 'user' }
    });

    if (defaultRole) {
      await user.addRole(defaultRole);
    }

    return {
      success: true,
      data: {
        userId: user.id,
        userName: user.userName,
        email: user.email,
      },
      message: '注册成功',
    };
  }

  /**
   * Login user with credentials
   * Requirement: 1.1
   * @param {string} userName - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Login result with tokens
   */
  static async login(userName, password) {
    // Find user by username
    const user = await User.findOne({
      where: { 
        userName,
        status: 'active',
      },
      include: [{
        model: Role,
        as: 'roles',
        where: { enabled: true },
        required: false,
      }],
    });

    if (!user) {
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: '用户名或密码错误',
      };
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: '用户名或密码错误',
      };
    }

    // Generate tokens
    const roles = user.roles || [];
    const accessToken = this.generateAccessToken(user, roles);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token in database
    const expiresAt = this.calculateExpirationDate(config.jwt.refreshExpiresIn);
    await RefreshToken.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    return {
      success: true,
      data: {
        token: accessToken,
        refreshToken,
        user: {
          userId: user.id,
          userName: user.userName,
          email: user.email,
          nickName: user.nickName,
          avatar: user.avatar,
          roles: roles.map(r => r.roleCode),
        },
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * Requirement: 1.6
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New access token
   */
  static async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      
      if (decoded.type !== 'refresh') {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: '无效的刷新令牌',
        };
      }

      // Check if refresh token exists in database and is not expired
      const storedToken = await RefreshToken.findOne({
        where: {
          token: refreshToken,
          userId: decoded.userId,
          expiresAt: { [Op.gt]: new Date() },
        },
      });

      if (!storedToken) {
        return {
          success: false,
          error: 'TOKEN_NOT_FOUND',
          message: '刷新令牌无效或已过期',
        };
      }

      // Get user with roles
      const user = await User.findOne({
        where: { 
          id: decoded.userId,
          status: 'active',
        },
        include: [{
          model: Role,
          as: 'roles',
          where: { enabled: true },
          required: false,
        }],
      });

      if (!user) {
        return {
          success: false,
          error: 'USER_NOT_FOUND',
          message: '用户不存在或已被禁用',
        };
      }

      // Generate new access token
      const roles = user.roles || [];
      const newAccessToken = this.generateAccessToken(user, roles);

      return {
        success: true,
        data: {
          token: newAccessToken,
        },
      };
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return {
          success: false,
          error: 'TOKEN_EXPIRED',
          message: '刷新令牌已过期，请重新登录',
        };
      }

      return {
        success: false,
        error: 'INVALID_TOKEN',
        message: '无效的刷新令牌',
      };
    }
  }

  /**
   * Logout user by invalidating refresh token
   * Requirement: 1.7
   * @param {string} refreshToken - Refresh token to invalidate
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Logout result
   */
  static async logout(refreshToken, userId) {
    try {
      // Delete the specific refresh token
      if (refreshToken) {
        await RefreshToken.destroy({
          where: { token: refreshToken },
        });
      }

      // Optionally delete all refresh tokens for the user
      // Uncomment if you want to logout from all devices
      // await RefreshToken.destroy({
      //   where: { userId },
      // });

      return {
        success: true,
        message: '登出成功',
      };
    } catch (err) {
      return {
        success: false,
        error: 'LOGOUT_FAILED',
        message: '登出失败',
      };
    }
  }

  /**
   * Get user info by ID
   * Requirement: 1.3
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User info with roles and permissions
   */
  static async getUserInfo(userId) {
    const user = await User.findOne({
      where: { 
        id: userId,
        status: 'active',
      },
      include: [{
        model: Role,
        as: 'roles',
        where: { enabled: true },
        required: false,
        include: [{
          model: require('../models/menu.model'),
          as: 'menus',
          attributes: ['id', 'name', 'path'],
        }],
      }],
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      };
    }

    // Extract role codes and button permissions
    const roles = user.roles || [];
    const roleCodes = roles.map(r => r.roleCode);
    
    // Extract button permissions from menus (buttons are typically menu items with specific types)
    const buttons = [];
    roles.forEach(role => {
      if (role.menus) {
        role.menus.forEach(menu => {
          if (menu.path && menu.path.startsWith('btn:')) {
            buttons.push(menu.path.replace('btn:', ''));
          }
        });
      }
    });

    return {
      success: true,
      data: {
        userId: user.id,
        userName: user.userName,
        email: user.email,
        nickName: user.nickName,
        phone: user.phone,
        gender: user.gender,
        avatar: user.avatar,
        backgroundImage: user.backgroundImage,
        address: user.address,
        intro: user.intro,
        roles: roleCodes,
        buttons: [...new Set(buttons)], // Remove duplicates
      },
    };
  }

  /**
   * Clean up expired refresh tokens
   * @returns {Promise<number>} Number of deleted tokens
   */
  static async cleanupExpiredTokens() {
    const result = await RefreshToken.destroy({
      where: {
        expiresAt: { [Op.lt]: new Date() },
      },
    });
    return result;
  }
}

module.exports = AuthService;
