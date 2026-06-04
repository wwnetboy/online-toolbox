const RoleService = require('../services/role.service');
const { success, error, paginated, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Role Controller
 * Handles role management endpoints
 * Requirements: 4.1-4.7
 */
class RoleController {
  /**
   * Get role list with pagination and filters
   * GET /api/role/list
   * Requirement: 4.1
   */
  static async getRoles(req, res) {
    try {
      const { current, size, roleName, roleCode, enabled } = req.query;

      const result = await RoleService.getRoles({
        current: parseInt(current, 10) || 1,
        size: parseInt(size, 10) || 10,
        roleName,
        roleCode,
        enabled,
      });

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      const { records, current: page, size: pageSize, total } = result.data;
      return paginated(res, records, page, pageSize, total, '查询角色列表成功');
    } catch (err) {
      logger.error('Get roles error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '查询角色列表失败');
    }
  }

  /**
   * Get all roles (without pagination)
   * GET /api/role/all
   * Useful for dropdowns
   */
  static async getAllRoles(req, res) {
    try {
      const result = await RoleService.getAllRoles();

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '获取角色列表成功');
    } catch (err) {
      logger.error('Get all roles error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取角色列表失败');
    }
  }


  /**
   * Get role by ID
   * GET /api/role/:id
   * Requirement: 4.1
   */
  static async getRoleById(req, res) {
    try {
      const { id } = req.params;

      const result = await RoleService.getRoleById(parseInt(id, 10));

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '获取角色信息成功');
    } catch (err) {
      logger.error('Get role by ID error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取角色信息失败');
    }
  }

  /**
   * Create new role
   * POST /api/role
   * Requirement: 4.2
   */
  static async createRole(req, res) {
    try {
      const { roleName, roleCode, description, enabled, menuIds } = req.body;

      const result = await RoleService.createRole({
        roleName,
        roleCode,
        description,
        enabled,
        menuIds,
      });

      if (!result.success) {
        if (result.error === 'ROLE_CODE_EXISTS') {
          return error(res, ErrorCodes.CONFLICT, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Role created: ${roleCode}`, { createdBy: req.user?.userId });
      return success(res, result.data, '创建角色成功', 201);
    } catch (err) {
      logger.error('Create role error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '创建角色失败');
    }
  }

  /**
   * Update role
   * PUT /api/role/:id
   * Requirement: 4.3
   */
  static async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { roleName, roleCode, description, enabled } = req.body;

      const result = await RoleService.updateRole(parseInt(id, 10), {
        roleName,
        roleCode,
        description,
        enabled,
      });

      if (!result.success) {
        if (result.error === 'ROLE_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        if (result.error === 'ROLE_CODE_EXISTS') {
          return error(res, ErrorCodes.CONFLICT, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Role updated: ${id}`, { updatedBy: req.user?.userId });
      return success(res, result.data, '更新角色成功');
    } catch (err) {
      logger.error('Update role error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '更新角色失败');
    }
  }


  /**
   * Update role permissions (menu assignments)
   * PUT /api/role/:id/permissions
   * Requirement: 4.4
   */
  static async updateRolePermissions(req, res) {
    try {
      const { id } = req.params;
      const { menuIds } = req.body;

      const result = await RoleService.updateRolePermissions(
        parseInt(id, 10),
        menuIds || []
      );

      if (!result.success) {
        if (result.error === 'ROLE_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Role permissions updated: ${id}`, { updatedBy: req.user?.userId });
      return success(res, result.data, '更新角色权限成功');
    } catch (err) {
      logger.error('Update role permissions error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '更新角色权限失败');
    }
  }

  /**
   * Delete role (soft delete)
   * DELETE /api/role/:id
   * Requirement: 4.6
   */
  static async deleteRole(req, res) {
    try {
      const { id } = req.params;

      const result = await RoleService.deleteRole(parseInt(id, 10));

      if (!result.success) {
        if (result.error === 'ROLE_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        if (result.error === 'ROLE_HAS_USERS') {
          return error(res, ErrorCodes.CONFLICT, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Role deleted: ${id}`, { deletedBy: req.user?.userId });
      return success(res, null, '删除角色成功');
    } catch (err) {
      logger.error('Delete role error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '删除角色失败');
    }
  }

  /**
   * Check if role code exists
   * GET /api/role/check-code
   * Requirement: 4.2
   */
  static async checkRoleCode(req, res) {
    try {
      const { roleCode, excludeId } = req.query;

      if (!roleCode) {
        return error(res, ErrorCodes.BAD_REQUEST, '角色编码不能为空');
      }

      const exists = await RoleService.isRoleCodeExists(
        roleCode,
        excludeId ? parseInt(excludeId, 10) : null
      );

      return success(res, { exists }, exists ? '角色编码已存在' : '角色编码可用');
    } catch (err) {
      logger.error('Check role code error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '检查角色编码失败');
    }
  }

  /**
   * Check if role has associated users
   * GET /api/role/:id/users
   * Requirement: 4.6
   */
  static async checkRoleUsers(req, res) {
    try {
      const { id } = req.params;

      const result = await RoleService.hasAssociatedUsers(parseInt(id, 10));

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '查询成功');
    } catch (err) {
      logger.error('Check role users error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '查询角色用户失败');
    }
  }
}

module.exports = RoleController;
