const { Op } = require('sequelize');
const { Menu, Role, sequelize } = require('../models');

/**
 * Menu Service
 * Handles menu CRUD operations, tree structure building, and permission filtering
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
class MenuService {
  /**
   * Get user menus filtered by role permissions
   * Requirement: 5.1
   * @param {Array<number>} roleIds - User's role IDs
   * @returns {Promise<Object>} Tree-structured menu list
   */
  static async getUserMenus(roleIds) {
    if (!roleIds || roleIds.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Get all menu IDs that the user's roles have access to
    const roles = await Role.findAll({
      where: {
        id: roleIds,
        enabled: true,
        deletedAt: null,
      },
      include: [
        {
          model: Menu,
          as: 'menus',
          attributes: ['id'],
          through: { attributes: [] },
        },
      ],
    });

    // Collect unique menu IDs from all roles
    const menuIdSet = new Set();
    roles.forEach(role => {
      if (role.menus) {
        role.menus.forEach(menu => menuIdSet.add(menu.id));
      }
    });

    if (menuIdSet.size === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Fetch full menu data for permitted menus
    const menus = await Menu.findAll({
      where: {
        id: Array.from(menuIdSet),
        deletedAt: null,
      },
      order: [['sort', 'ASC'], ['id', 'ASC']],
    });

    // Build tree structure
    const menuTree = this.buildMenuTree(menus);

    return {
      success: true,
      data: menuTree,
    };
  }


  /**
   * Get all menus (for admin management)
   * @returns {Promise<Object>} Tree-structured menu list
   */
  static async getAllMenus() {
    const menus = await Menu.findAll({
      where: {
        deletedAt: null,
      },
      order: [['sort', 'ASC'], ['id', 'ASC']],
    });

    const menuTree = this.buildMenuTree(menus);

    return {
      success: true,
      data: menuTree,
    };
  }

  /**
   * Get menu by ID
   * @param {number} id - Menu ID
   * @returns {Promise<Object>} Menu data
   */
  static async getMenuById(id) {
    const menu = await Menu.findOne({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!menu) {
      return {
        success: false,
        error: 'MENU_NOT_FOUND',
        message: '菜单不存在',
      };
    }

    return {
      success: true,
      data: this.formatMenuResponse(menu),
    };
  }

  /**
   * Create a new menu
   * Requirement: 5.3
   * @param {Object} menuData - Menu data
   * @returns {Promise<Object>} Created menu
   */
  static async createMenu(menuData) {
    const { parentId, path, name, component, redirect, icon, sort, hidden, meta } = menuData;

    // Validate parent exists if parentId is provided
    if (parentId) {
      const parentMenu = await Menu.findOne({
        where: { id: parentId, deletedAt: null },
      });
      if (!parentMenu) {
        return {
          success: false,
          error: 'PARENT_NOT_FOUND',
          message: '父级菜单不存在',
        };
      }
    }

    const menu = await Menu.create({
      parentId: parentId || null,
      path,
      name,
      component,
      redirect,
      icon,
      sort: sort || 0,
      hidden: hidden || false,
      meta: meta || null,
    });

    return {
      success: true,
      data: this.formatMenuResponse(menu),
    };
  }


  /**
   * Update menu
   * Requirement: 5.4
   * @param {number} id - Menu ID
   * @param {Object} menuData - Menu data to update
   * @returns {Promise<Object>} Updated menu
   */
  static async updateMenu(id, menuData) {
    const menu = await Menu.findOne({
      where: { id, deletedAt: null },
    });

    if (!menu) {
      return {
        success: false,
        error: 'MENU_NOT_FOUND',
        message: '菜单不存在',
      };
    }

    const { parentId, path, name, component, redirect, icon, sort, hidden, meta } = menuData;

    // Validate parent exists if parentId is being updated
    if (parentId !== undefined && parentId !== null) {
      // Prevent setting self as parent
      if (parentId === id) {
        return {
          success: false,
          error: 'INVALID_PARENT',
          message: '不能将自己设为父级菜单',
        };
      }

      const parentMenu = await Menu.findOne({
        where: { id: parentId, deletedAt: null },
      });
      if (!parentMenu) {
        return {
          success: false,
          error: 'PARENT_NOT_FOUND',
          message: '父级菜单不存在',
        };
      }

      // Check for circular reference
      const isCircular = await this.checkCircularReference(id, parentId);
      if (isCircular) {
        return {
          success: false,
          error: 'CIRCULAR_REFERENCE',
          message: '不能形成循环引用',
        };
      }
    }

    // Build update data
    const updateData = {};
    if (parentId !== undefined) updateData.parentId = parentId;
    if (path !== undefined) updateData.path = path;
    if (name !== undefined) updateData.name = name;
    if (component !== undefined) updateData.component = component;
    if (redirect !== undefined) updateData.redirect = redirect;
    if (icon !== undefined) updateData.icon = icon;
    if (sort !== undefined) updateData.sort = sort;
    if (hidden !== undefined) updateData.hidden = hidden;
    if (meta !== undefined) updateData.meta = meta;

    await menu.update(updateData);

    return this.getMenuById(id);
  }

  /**
   * Delete menu (soft delete)
   * Requirement: 5.5
   * @param {number} id - Menu ID
   * @returns {Promise<Object>} Delete result
   */
  static async deleteMenu(id) {
    const menu = await Menu.findOne({
      where: { id, deletedAt: null },
    });

    if (!menu) {
      return {
        success: false,
        error: 'MENU_NOT_FOUND',
        message: '菜单不存在',
      };
    }

    // Check for child menus
    const childCount = await Menu.count({
      where: {
        parentId: id,
        deletedAt: null,
      },
    });

    if (childCount > 0) {
      return {
        success: false,
        error: 'MENU_HAS_CHILDREN',
        message: `该菜单下有 ${childCount} 个子菜单，无法删除`,
      };
    }

    // Soft delete
    await menu.update({
      deletedAt: new Date(),
    });

    return {
      success: true,
      message: '菜单删除成功',
    };
  }


  /**
   * Check for circular reference in menu hierarchy
   * @param {number} menuId - Menu ID being updated
   * @param {number} newParentId - New parent ID
   * @returns {Promise<boolean>} True if circular reference would be created
   */
  static async checkCircularReference(menuId, newParentId) {
    let currentId = newParentId;
    const visited = new Set();

    while (currentId) {
      if (visited.has(currentId)) {
        return true; // Already visited, circular
      }
      if (currentId === menuId) {
        return true; // Would create circular reference
      }
      visited.add(currentId);

      const parent = await Menu.findOne({
        where: { id: currentId, deletedAt: null },
        attributes: ['parentId'],
      });

      currentId = parent ? parent.parentId : null;
    }

    return false;
  }

  /**
   * Build tree structure from flat menu list
   * Requirement: 5.2
   * @param {Array} menus - Flat menu list
   * @returns {Array} Tree-structured menu list
   */
  static buildMenuTree(menus) {
    const menuMap = new Map();
    const rootMenus = [];

    // First pass: create map of all menus
    menus.forEach(menu => {
      const menuData = this.formatMenuResponse(menu);
      menuData.children = [];
      menuMap.set(menu.id, menuData);
    });

    // Second pass: build tree structure
    menus.forEach(menu => {
      const menuData = menuMap.get(menu.id);
      if (menu.parentId && menuMap.has(menu.parentId)) {
        const parent = menuMap.get(menu.parentId);
        parent.children.push(menuData);
      } else {
        rootMenus.push(menuData);
      }
    });

    // Remove empty children arrays and sort
    const cleanTree = (nodes) => {
      return nodes.map(node => {
        if (node.children && node.children.length > 0) {
          node.children = cleanTree(node.children);
          // Sort children by sort field
          node.children.sort((a, b) => (a.meta?.sort || 0) - (b.meta?.sort || 0));
        } else {
          delete node.children;
        }
        return node;
      });
    };

    return cleanTree(rootMenus);
  }

  /**
   * Format menu response
   * Requirement: 5.6
   * @param {Object} menu - Menu model instance
   * @returns {Object} Formatted menu data
   */
  static formatMenuResponse(menu) {
    const menuData = menu.toJSON ? menu.toJSON() : menu;
    return {
      id: menuData.id,
      parentId: menuData.parentId,
      path: menuData.path,
      name: menuData.name,
      component: menuData.component,
      redirect: menuData.redirect,
      meta: {
        title: menuData.meta?.title || menuData.name,
        icon: menuData.icon || menuData.meta?.icon,
        hidden: menuData.hidden,
        sort: menuData.sort,
        ...menuData.meta,
      },
    };
  }

  /**
   * Get user's permission buttons
   * @param {Array<number>} roleIds - User's role IDs
   * @returns {Promise<Array<string>>} List of button permission codes
   */
  static async getUserButtons(roleIds) {
    if (!roleIds || roleIds.length === 0) {
      return [];
    }

    const roles = await Role.findAll({
      where: {
        id: roleIds,
        enabled: true,
        deletedAt: null,
      },
      include: [
        {
          model: Menu,
          as: 'menus',
          attributes: ['meta'],
          through: { attributes: [] },
        },
      ],
    });

    const buttonSet = new Set();
    roles.forEach(role => {
      if (role.menus) {
        role.menus.forEach(menu => {
          if (menu.meta && menu.meta.buttons) {
            menu.meta.buttons.forEach(btn => buttonSet.add(btn));
          }
        });
      }
    });

    return Array.from(buttonSet);
  }
}

module.exports = MenuService;
