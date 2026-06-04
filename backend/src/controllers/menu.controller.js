const MenuService = require('../services/menu.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Menu Controller
 * Handles menu management endpoints
 * Requirements: 5.1-5.6
 */
class MenuController {
  /**
   * Get user menus (filtered by role permissions)
   * GET /api/v3/system/menus
   * Requirement: 5.1
   */
  static async getUserMenus(req, res) {
    try {
      const user = req.user;
      
      if (!user || !user.roleIds) {
        return error(res, ErrorCodes.UNAUTHORIZED, '用户未登录或无角色');
      }

      const result = await MenuService.getUserMenus(user.roleIds);

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '获取菜单成功');
    } catch (err) {
      logger.error('Get user menus error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取菜单失败');
    }
  }

  /**
   * Get all menus (for admin management)
   * GET /api/menu/list
   * Requirement: 5.1
   */
  static async getAllMenus(req, res) {
    try {
      const result = await MenuService.getAllMenus();

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '获取菜单列表成功');
    } catch (err) {
      logger.error('Get all menus error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取菜单列表失败');
    }
  }

  /**
   * Get menu by ID
   * GET /api/menu/:id
   */
  static async getMenuById(req, res) {
    try {
      const { id } = req.params;

      const result = await MenuService.getMenuById(parseInt(id, 10));

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '获取菜单信息成功');
    } catch (err) {
      logger.error('Get menu by ID error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取菜单信息失败');
    }
  }


  /**
   * Create new menu
   * POST /api/menu
   * Requirement: 5.3
   */
  static async createMenu(req, res) {
    try {
      const { parentId, path, name, component, redirect, icon, sort, hidden, meta } = req.body;

      const result = await MenuService.createMenu({
        parentId,
        path,
        name,
        component,
        redirect,
        icon,
        sort,
        hidden,
        meta,
      });

      if (!result.success) {
        if (result.error === 'PARENT_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Menu created: ${name}`, { createdBy: req.user?.userId });
      return success(res, result.data, '创建菜单成功', 201);
    } catch (err) {
      logger.error('Create menu error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '创建菜单失败');
    }
  }

  /**
   * Update menu
   * PUT /api/menu/:id
   * Requirement: 5.4
   */
  static async updateMenu(req, res) {
    try {
      const { id } = req.params;
      const { parentId, path, name, component, redirect, icon, sort, hidden, meta } = req.body;

      const result = await MenuService.updateMenu(parseInt(id, 10), {
        parentId,
        path,
        name,
        component,
        redirect,
        icon,
        sort,
        hidden,
        meta,
      });

      if (!result.success) {
        if (result.error === 'MENU_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        if (result.error === 'PARENT_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        if (result.error === 'INVALID_PARENT' || result.error === 'CIRCULAR_REFERENCE') {
          return error(res, ErrorCodes.BAD_REQUEST, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Menu updated: ${id}`, { updatedBy: req.user?.userId });
      return success(res, result.data, '更新菜单成功');
    } catch (err) {
      logger.error('Update menu error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '更新菜单失败');
    }
  }

  /**
   * Delete menu (soft delete)
   * DELETE /api/menu/:id
   * Requirement: 5.5
   */
  static async deleteMenu(req, res) {
    try {
      const { id } = req.params;

      const result = await MenuService.deleteMenu(parseInt(id, 10));

      if (!result.success) {
        if (result.error === 'MENU_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        if (result.error === 'MENU_HAS_CHILDREN') {
          return error(res, ErrorCodes.CONFLICT, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Menu deleted: ${id}`, { deletedBy: req.user?.userId });
      return success(res, null, '删除菜单成功');
    } catch (err) {
      logger.error('Delete menu error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '删除菜单失败');
    }
  }

  /**
   * Get user's permission buttons
   * GET /api/menu/buttons
   */
  static async getUserButtons(req, res) {
    try {
      const user = req.user;
      
      if (!user || !user.roleIds) {
        return error(res, ErrorCodes.UNAUTHORIZED, '用户未登录或无角色');
      }

      const buttons = await MenuService.getUserButtons(user.roleIds);

      return success(res, buttons, '获取权限按钮成功');
    } catch (err) {
      logger.error('Get user buttons error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取权限按钮失败');
    }
  }
}

module.exports = MenuController;
