const { Op } = require('sequelize');
const { Role, User, Menu, sequelize } = require('../models');

/**
 * Role Service
 * Handles role CRUD operations and permission assignment
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
class RoleService {
  /**
   * Get paginated role list with search filters
   * Requirement: 4.1
   * @param {Object} params - Search and pagination parameters
   * @returns {Promise<Object>} Paginated role list
   */
  static async getRoles(params = {}) {
    const {
      current = 1,
      size = 10,
      roleName,
      roleCode,
      enabled,
    } = params;

    // Build where clause for filtering
    const where = {
      deletedAt: null,
    };

    if (roleName) {
      where.roleName = { [Op.like]: `%${roleName}%` };
    }
    if (roleCode) {
      where.roleCode = { [Op.like]: `%${roleCode}%` };
    }
    if (enabled !== undefined && enabled !== null && enabled !== '') {
      where.enabled = enabled === true || enabled === 'true';
    }

    // Calculate offset
    const offset = (current - 1) * size;

    // Query with pagination
    const { count, rows } = await Role.findAndCountAll({
      where,
      offset,
      limit: size,
      order: [['createdAt', 'DESC']],
    });

    // Transform records to match API response format
    const records = rows.map(role => this.formatRoleResponse(role));

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
   * Get all roles (without pagination)
   * Useful for dropdowns and selection lists
   * @returns {Promise<Object>} All active roles
   */
  static async getAllRoles() {
    const roles = await Role.findAll({
      where: {
        deletedAt: null,
        enabled: true,
      },
      order: [['createdAt', 'ASC']],
    });

    return {
      success: true,
      data: roles.map(role => this.formatRoleResponse(role)),
    };
  }

  /**
   * Get role by ID
   * @param {number} id - Role ID
   * @returns {Promise<Object>} Role data
   */
  static async getRoleById(id) {
    const role = await Role.findOne({
      where: {
        id,
        deletedAt: null,
      },
      include: [
        {
          model: Menu,
          as: 'menus',
          attributes: ['id', 'name', 'path'],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) {
      return {
        success: false,
        error: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      };
    }

    return {
      success: true,
      data: this.formatRoleResponse(role),
    };
  }

  /**
   * Create a new role
   * Requirement: 4.2
   * @param {Object} roleData - Role data
   * @returns {Promise<Object>} Created role
   */
  static async createRole(roleData) {
    const { roleName, roleCode, description, enabled = true, menuIds = [] } = roleData;

    // Check for existing roleCode
    const existingRole = await Role.findOne({
      where: { roleCode, deletedAt: null },
    });
    if (existingRole) {
      return {
        success: false,
        error: 'ROLE_CODE_EXISTS',
        message: '角色编码已存在',
      };
    }

    // Create role with transaction
    const transaction = await sequelize.transaction();
    try {
      const role = await Role.create(
        {
          roleName,
          roleCode,
          description,
          enabled,
        },
        { transaction }
      );

      // Assign menus if provided
      if (menuIds && menuIds.length > 0) {
        const menus = await Menu.findAll({
          where: { id: menuIds },
        });
        await role.setMenus(menus, { transaction });
      }

      await transaction.commit();

      // Fetch the created role with associations
      return this.getRoleById(role.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }


  /**
   * Update role
   * Requirement: 4.3
   * @param {number} id - Role ID
   * @param {Object} roleData - Role data to update
   * @returns {Promise<Object>} Updated role
   */
  static async updateRole(id, roleData) {
    const role = await Role.findOne({
      where: { id, deletedAt: null },
    });

    if (!role) {
      return {
        success: false,
        error: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      };
    }

    const { roleName, roleCode, description, enabled } = roleData;

    // Check roleCode uniqueness if being updated
    if (roleCode && roleCode !== role.roleCode) {
      const existingRole = await Role.findOne({
        where: {
          roleCode,
          id: { [Op.ne]: id },
          deletedAt: null,
        },
      });
      if (existingRole) {
        return {
          success: false,
          error: 'ROLE_CODE_EXISTS',
          message: '角色编码已存在',
        };
      }
    }

    // Build update data
    const updateData = {};
    if (roleName !== undefined) updateData.roleName = roleName;
    if (roleCode !== undefined) updateData.roleCode = roleCode;
    if (description !== undefined) updateData.description = description;
    if (enabled !== undefined) updateData.enabled = enabled;

    await role.update(updateData);

    // Fetch the updated role with associations
    return this.getRoleById(id);
  }

  /**
   * Update role permissions (menu assignments)
   * Requirement: 4.4
   * @param {number} id - Role ID
   * @param {Array<number>} menuIds - Menu IDs to assign
   * @returns {Promise<Object>} Updated role
   */
  static async updateRolePermissions(id, menuIds) {
    const role = await Role.findOne({
      where: { id, deletedAt: null },
    });

    if (!role) {
      return {
        success: false,
        error: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      };
    }

    // Update menu associations
    const transaction = await sequelize.transaction();
    try {
      const menus = await Menu.findAll({
        where: { id: menuIds },
      });
      await role.setMenus(menus, { transaction });

      await transaction.commit();

      // Fetch the updated role with associations
      return this.getRoleById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }


  /**
   * Delete role (soft delete)
   * Requirement: 4.6
   * @param {number} id - Role ID
   * @returns {Promise<Object>} Delete result
   */
  static async deleteRole(id) {
    const role = await Role.findOne({
      where: { id, deletedAt: null },
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id'],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) {
      return {
        success: false,
        error: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      };
    }

    // Check if role has associated users
    if (role.users && role.users.length > 0) {
      return {
        success: false,
        error: 'ROLE_HAS_USERS',
        message: `该角色下有 ${role.users.length} 个用户，无法删除`,
      };
    }

    // Soft delete by setting deletedAt
    await role.update({
      deletedAt: new Date(),
    });

    return {
      success: true,
      message: '角色删除成功',
    };
  }

  /**
   * Check if role code exists
   * @param {string} roleCode - Role code to check
   * @param {number} excludeId - Role ID to exclude from check
   * @returns {Promise<boolean>} True if role code exists
   */
  static async isRoleCodeExists(roleCode, excludeId = null) {
    const where = { roleCode, deletedAt: null };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const role = await Role.findOne({ where });
    return !!role;
  }

  /**
   * Check if role has associated users
   * @param {number} id - Role ID
   * @returns {Promise<Object>} Result with user count
   */
  static async hasAssociatedUsers(id) {
    const role = await Role.findOne({
      where: { id, deletedAt: null },
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id'],
          through: { attributes: [] },
          where: { deletedAt: null },
          required: false,
        },
      ],
    });

    if (!role) {
      return {
        success: false,
        error: 'ROLE_NOT_FOUND',
        message: '角色不存在',
      };
    }

    const userCount = role.users ? role.users.length : 0;
    return {
      success: true,
      data: {
        hasUsers: userCount > 0,
        userCount,
      },
    };
  }

  /**
   * Format role response
   * Requirement: 4.7
   * @param {Object} role - Role model instance
   * @returns {Object} Formatted role data
   */
  static formatRoleResponse(role) {
    const roleData = role.toJSON ? role.toJSON() : role;
    return {
      roleId: roleData.id,
      roleName: roleData.roleName,
      roleCode: roleData.roleCode,
      description: roleData.description,
      enabled: roleData.enabled,
      createTime: roleData.createdAt,
      updateTime: roleData.updatedAt,
      menuIds: roleData.menus ? roleData.menus.map(m => m.id) : [],
    };
  }
}

module.exports = RoleService;
