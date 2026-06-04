const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Role, sequelize } = require('../models');

/**
 * User Service
 * Handles user CRUD operations, pagination, search filtering, and soft delete
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
class UserService {
  /**
   * Get paginated user list with search filters
   * Requirement: 2.1, 2.5
   * @param {Object} params - Search and pagination parameters
   * @returns {Promise<Object>} Paginated user list
   */
  static async getUsers(params = {}) {
    const {
      current = 1,
      size = 10,
      userName,
      userEmail,
      userPhone,
      userGender,
      status,
    } = params;

    // Build where clause for filtering
    const where = {
      deletedAt: null, // Exclude soft-deleted records
    };

    if (userName) {
      where.userName = { [Op.like]: `%${userName}%` };
    }
    if (userEmail) {
      where.email = { [Op.like]: `%${userEmail}%` };
    }
    if (userPhone) {
      where.phone = { [Op.like]: `%${userPhone}%` };
    }
    if (userGender) {
      where.gender = userGender;
    }
    if (status) {
      where.status = status;
    }

    // Calculate offset
    const offset = (current - 1) * size;

    // Query with pagination
    const { count, rows } = await User.findAndCountAll({
      where,
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'roleName', 'roleCode'],
          through: { attributes: [] },
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'userName', 'nickName'],
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'userName', 'nickName'],
        },
      ],
      attributes: { exclude: ['password'] },
      offset,
      limit: size,
      order: [['createdAt', 'DESC']],
    });

    // Transform records to match API response format
    const records = rows.map(user => this.formatUserResponse(user));

    return {
      success: true,
      data: {
        records,
        current: parseInt(current, 10),
        size: parseInt(size, 10),
        total: count,
      },
    };
  }


  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object>} User data
   */
  static async getUserById(id) {
    const user = await User.findOne({
      where: {
        id,
        deletedAt: null,
      },
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'roleName', 'roleCode'],
          through: { attributes: [] },
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'userName', 'nickName'],
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'userName', 'nickName'],
        },
      ],
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      };
    }

    return {
      success: true,
      data: this.formatUserResponse(user),
    };
  }

  /**
   * Create a new user
   * Requirement: 2.2, 2.6
   * @param {Object} userData - User data
   * @param {number} createdBy - ID of user creating this record
   * @returns {Promise<Object>} Created user
   */
  static async createUser(userData, createdBy = null) {
    const { userName, password, email, nickName, phone, gender, roleIds = [], avatar, status } = userData;

    // Check for existing username
    const existingUserName = await User.findOne({
      where: { userName, deletedAt: null },
    });
    if (existingUserName) {
      return {
        success: false,
        error: 'USERNAME_EXISTS',
        message: '用户名已存在',
      };
    }

    // Check for existing email
    const existingEmail = await User.findOne({
      where: { email, deletedAt: null },
    });
    if (existingEmail) {
      return {
        success: false,
        error: 'EMAIL_EXISTS',
        message: '邮箱已存在',
      };
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with transaction
    const transaction = await sequelize.transaction();
    try {
      const user = await User.create(
        {
          userName,
          password: hashedPassword,
          email,
          nickName,
          phone,
          gender: gender || 'unknown',
          avatar,
          status: status || 'active',
          createdBy,
          updatedBy: createdBy,
        },
        { transaction }
      );

      // Assign roles if provided
      if (roleIds && roleIds.length > 0) {
        const roles = await Role.findAll({
          where: { id: roleIds },
        });
        await user.setRoles(roles, { transaction });
      }

      await transaction.commit();

      // Fetch the created user with associations
      return this.getUserById(user.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }


  /**
   * Update user
   * Requirement: 2.3
   * @param {number} id - User ID
   * @param {Object} userData - User data to update
   * @param {number} updatedBy - ID of user updating this record
   * @returns {Promise<Object>} Updated user
   */
  static async updateUser(id, userData, updatedBy = null) {
    const user = await User.findOne({
      where: { id, deletedAt: null },
    });

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      };
    }

    const { nickName, email, phone, gender, status, roleIds, avatar, address, intro } = userData;

    // Check email uniqueness if being updated
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: id },
          deletedAt: null,
        },
      });
      if (existingEmail) {
        return {
          success: false,
          error: 'EMAIL_EXISTS',
          message: '邮箱已存在',
        };
      }
    }

    // Update user with transaction
    const transaction = await sequelize.transaction();
    try {
      // Build update data
      const updateData = { updatedBy };
      if (nickName !== undefined) updateData.nickName = nickName;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (gender !== undefined) updateData.gender = gender;
      if (status !== undefined) updateData.status = status;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (address !== undefined) updateData.address = address;
      if (intro !== undefined) updateData.intro = intro;

      await user.update(updateData, { transaction });

      // Update roles if provided
      if (roleIds !== undefined) {
        const roles = await Role.findAll({
          where: { id: roleIds },
        });
        await user.setRoles(roles, { transaction });
      }

      await transaction.commit();

      // Fetch the updated user with associations
      return this.getUserById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Soft delete user
   * Requirement: 2.4
   * @param {number} id - User ID
   * @param {number} deletedBy - ID of user deleting this record
   * @returns {Promise<Object>} Delete result
   */
  static async deleteUser(id, deletedBy = null) {
    const user = await User.findOne({
      where: { id, deletedAt: null },
    });

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      };
    }

    // Soft delete by setting deletedAt
    await user.update({
      deletedAt: new Date(),
      updatedBy: deletedBy,
    });

    return {
      success: true,
      message: '用户删除成功',
    };
  }

  /**
   * Batch soft delete users
   * @param {Array<number>} ids - User IDs to delete
   * @param {number} deletedBy - ID of user deleting these records
   * @returns {Promise<Object>} Delete result
   */
  static async batchDeleteUsers(ids, deletedBy = null) {
    const result = await User.update(
      {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
      {
        where: {
          id: ids,
          deletedAt: null,
        },
      }
    );

    return {
      success: true,
      message: `成功删除 ${result[0]} 个用户`,
      data: { deletedCount: result[0] },
    };
  }


  /**
   * Check if username exists
   * @param {string} userName - Username to check
   * @param {number} excludeId - User ID to exclude from check
   * @returns {Promise<boolean>} True if username exists
   */
  static async isUserNameExists(userName, excludeId = null) {
    const where = { userName, deletedAt: null };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const user = await User.findOne({ where });
    return !!user;
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @param {number} excludeId - User ID to exclude from check
   * @returns {Promise<boolean>} True if email exists
   */
  static async isEmailExists(email, excludeId = null) {
    const where = { email, deletedAt: null };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const user = await User.findOne({ where });
    return !!user;
  }

  /**
   * Update user password
   * Requirement: 3.3
   * @param {number} id - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Update result
   */
  static async updatePassword(id, currentPassword, newPassword) {
    const user = await User.findOne({
      where: { id, deletedAt: null },
    });

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      };
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'INVALID_PASSWORD',
        message: '当前密码错误',
      };
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await user.update({ password: hashedPassword });

    return {
      success: true,
      message: '密码修改成功',
    };
  }

  /**
   * Update user profile (personal info)
   * Requirement: 3.2
   * @param {number} id - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated user
   */
  static async updateProfile(id, profileData) {
    const user = await User.findOne({
      where: { id, deletedAt: null },
    });

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      };
    }

    const { nickName, email, phone, gender, avatar, address, intro, backgroundImage } = profileData;

    // Check email uniqueness if being updated
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: id },
          deletedAt: null,
        },
      });
      if (existingEmail) {
        return {
          success: false,
          error: 'EMAIL_EXISTS',
          message: '邮箱已存在',
        };
      }
    }

    // Build update data
    const updateData = { updatedBy: id };
    if (nickName !== undefined) updateData.nickName = nickName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (address !== undefined) updateData.address = address;
    if (intro !== undefined) updateData.intro = intro;
    if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage;

    await user.update(updateData);

    // Fetch the updated user with associations
    return this.getUserById(id);
  }

  /**
   * Format user response
   * Requirement: 2.7
   * @param {Object} user - User model instance
   * @returns {Object} Formatted user data
   */
  static formatUserResponse(user) {
    const userData = user.toJSON ? user.toJSON() : user;
    return {
      id: userData.id,
      avatar: userData.avatar,
      backgroundImage: userData.backgroundImage,
      status: userData.status,
      userName: userData.userName,
      nickName: userData.nickName,
      // 统一字段名：前端使用这些字段
      email: userData.email,
      phone: userData.phone,
      gender: userData.gender,
      // 兼容旧字段名（用户列表等地方使用）
      userEmail: userData.email,
      userPhone: userData.phone,
      userGender: userData.gender,
      address: userData.address,
      intro: userData.intro,
      userRoles: userData.roles ? userData.roles.map(r => r.roleCode) : [],
      roleIds: userData.roles ? userData.roles.map(r => r.id) : [],
      createBy: userData.creator ? userData.creator.userName || userData.creator.nickName : null,
      createTime: userData.createdAt,
      updateBy: userData.updater ? userData.updater.userName || userData.updater.nickName : null,
      updateTime: userData.updatedAt,
    };
  }
}

module.exports = UserService;
