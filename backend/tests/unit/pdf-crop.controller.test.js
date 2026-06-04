/**
 * Unit Tests for PDF Crop Controller
 * Tests the controller methods for handling PDF crop requests
 * Requirements: 4.1, 4.2, 4.5
 */

// Mock logger before requiring any modules that use it
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock the service
jest.mock('../../src/services/pdf-crop.service');

// Mock fs module
jest.mock('fs');

const PdfCropController = require('../../src/controllers/pdf-crop.controller');
const { PdfCropService, TaskStatus } = require('../../src/services/pdf-crop.service');
const { ErrorCodes } = require('../../src/utils/response');
const fs = require('fs');

describe('PdfCropController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      body: {},
      params: {},
      headers: {},
      user: null,
      file: null,
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    // Mock fs.existsSync to return true by default
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.unlinkSync = jest.fn();
    fs.createReadStream = jest.fn().mockReturnValue({
      pipe: jest.fn(),
      on: jest.fn(),
    });
  });

  describe('submitCrop', () => {
    it('should return error if no file is uploaded', async () => {
      await PdfCropController.submitCrop(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.BAD_REQUEST,
          msg: '请上传 PDF 文件',
        })
      );
    });

    it('should return error if file is not a PDF', async () => {
      mockReq.file = {
        path: '/tmp/test.txt',
        mimetype: 'text/plain',
        size: 1024,
        originalname: 'test.txt',
      };

      await PdfCropController.submitCrop(mockReq, mockRes);

      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/test.txt');
      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: '文件类型不正确，请上传 PDF 文件',
        })
      );
    });

    it('should return error if file size exceeds limit', async () => {
      mockReq.file = {
        path: '/tmp/test.pdf',
        mimetype: 'application/pdf',
        size: 101 * 1024 * 1024, // 101MB
        originalname: 'test.pdf',
      };

      await PdfCropController.submitCrop(mockReq, mockRes);

      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/test.pdf');
      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: '文件大小超过 100MB 限制',
        })
      );
    });

    it('should return error if crop parameters are invalid', async () => {
      mockReq.file = {
        path: '/tmp/test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'test.pdf',
      };
      mockReq.body = {
        cropArea: { x: -10, y: 10, width: 100, height: 100 },
        applyMode: 'all',
      };

      PdfCropService.validateCropParams.mockReturnValue({
        valid: false,
        error: '裁剪区域 X 坐标无效',
      });

      await PdfCropController.submitCrop(mockReq, mockRes);

      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/test.pdf');
      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: '裁剪区域 X 坐标无效',
        })
      );
    });

    it('should create crop task successfully with valid parameters', async () => {
      mockReq.file = {
        path: '/tmp/test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'test.pdf',
      };
      mockReq.body = {
        cropArea: { x: 10, y: 10, width: 100, height: 100 },
        applyMode: 'all',
      };
      mockReq.headers = {
        'x-visitor-id': 'visitor123',
      };

      const mockTask = {
        taskId: 'crop_123',
        status: TaskStatus.PENDING,
        createdAt: new Date(),
      };

      PdfCropService.validateCropParams.mockReturnValue({ valid: true });
      PdfCropService.createCropTask.mockReturnValue(mockTask);

      await PdfCropController.submitCrop(mockReq, mockRes);

      expect(PdfCropService.createCropTask).toHaveBeenCalledWith(
        mockReq.file,
        {
          cropArea: mockReq.body.cropArea,
          applyMode: 'all',
          pages: undefined,
          currentPage: undefined,
        },
        null,
        'visitor123'
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          msg: '裁剪任务已提交',
          data: mockTask,
        })
      );
    });

    it('should parse JSON string parameters', async () => {
      mockReq.file = {
        path: '/tmp/test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'test.pdf',
      };
      mockReq.body = {
        cropArea: JSON.stringify({ x: 10, y: 10, width: 100, height: 100 }),
        applyMode: 'range',
        pages: JSON.stringify([1, 2, 3]),
        currentPage: '1',
      };

      const mockTask = {
        taskId: 'crop_123',
        status: TaskStatus.PENDING,
        createdAt: new Date(),
      };

      PdfCropService.validateCropParams.mockReturnValue({ valid: true });
      PdfCropService.createCropTask.mockReturnValue(mockTask);

      await PdfCropController.submitCrop(mockReq, mockRes);

      expect(PdfCropService.createCropTask).toHaveBeenCalledWith(
        mockReq.file,
        {
          cropArea: { x: 10, y: 10, width: 100, height: 100 },
          applyMode: 'range',
          pages: [1, 2, 3],
          currentPage: 1,
        },
        null,
        null
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getTaskStatus', () => {
    it('should return error if taskId is not provided', async () => {
      await PdfCropController.getTaskStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: '请提供任务ID',
        })
      );
    });

    it('should return error if task is not found', async () => {
      mockReq.params.taskId = 'nonexistent';
      PdfCropService.getTaskStatus.mockReturnValue(null);

      await PdfCropController.getTaskStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: '任务不存在',
        })
      );
    });

    it('should return task status successfully', async () => {
      mockReq.params.taskId = 'crop_123';
      const mockStatus = {
        taskId: 'crop_123',
        status: TaskStatus.PROCESSING,
        progress: 50,
      };

      PdfCropService.getTaskStatus.mockReturnValue(mockStatus);

      await PdfCropController.getTaskStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          msg: '获取任务状态成功',
          data: mockStatus,
        })
      );
    });
  });

  describe('downloadResult', () => {
    it('should return error if taskId is not provided', async () => {
      await PdfCropController.downloadResult(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
    });

    it('should return error if task is not found', async () => {
      mockReq.params.taskId = 'nonexistent';
      PdfCropService.getTaskStatus.mockReturnValue(null);

      await PdfCropController.downloadResult(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.NOT_FOUND);
    });

    it('should return error if task is not completed', async () => {
      mockReq.params.taskId = 'crop_123';
      PdfCropService.getTaskStatus.mockReturnValue({
        taskId: 'crop_123',
        status: TaskStatus.PROCESSING,
      });

      await PdfCropController.downloadResult(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.stringContaining('任务尚未完成'),
        })
      );
    });

    it('should return error if output file does not exist', async () => {
      mockReq.params.taskId = 'crop_123';
      PdfCropService.getTaskStatus.mockReturnValue({
        taskId: 'crop_123',
        status: TaskStatus.COMPLETED,
      });
      PdfCropService.getTaskOutput.mockReturnValue({
        path: '/tmp/output.pdf',
        filename: 'output.pdf',
        size: 1024,
      });
      fs.existsSync.mockReturnValue(false);

      await PdfCropController.downloadResult(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.NOT_FOUND);
    });

    it('should stream file successfully', async () => {
      mockReq.params.taskId = 'crop_123';
      PdfCropService.getTaskStatus.mockReturnValue({
        taskId: 'crop_123',
        status: TaskStatus.COMPLETED,
      });
      PdfCropService.getTaskOutput.mockReturnValue({
        path: '/tmp/output.pdf',
        filename: 'output.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      });

      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn(),
      };
      fs.createReadStream.mockReturnValue(mockStream);

      await PdfCropController.downloadResult(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment')
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', 1024);
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });
  });

  describe('deleteTask', () => {
    it('should return error if taskId is not provided', async () => {
      await PdfCropController.deleteTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
    });

    it('should return error if task is not found', async () => {
      mockReq.params.taskId = 'nonexistent';
      PdfCropService.deleteTask.mockReturnValue(false);

      await PdfCropController.deleteTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.NOT_FOUND);
    });

    it('should delete task successfully', async () => {
      mockReq.params.taskId = 'crop_123';
      PdfCropService.deleteTask.mockReturnValue(true);

      await PdfCropController.deleteTask(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: '任务已删除',
        })
      );
    });
  });

  describe('getUserTasks', () => {
    it('should return error if no user identification', async () => {
      await PdfCropController.getUserTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: '无法识别用户',
        })
      );
    });

    it('should return tasks for authenticated user', async () => {
      mockReq.user = { id: 'user123' };
      const mockTasks = [
        { taskId: 'crop_1', status: TaskStatus.COMPLETED },
        { taskId: 'crop_2', status: TaskStatus.PROCESSING },
      ];

      PdfCropService.getUserTasks.mockReturnValue(mockTasks);

      await PdfCropController.getUserTasks(mockReq, mockRes);

      expect(PdfCropService.getUserTasks).toHaveBeenCalledWith('user123', null);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { tasks: mockTasks },
        })
      );
    });

    it('should return tasks for visitor', async () => {
      mockReq.headers['x-visitor-id'] = 'visitor123';
      const mockTasks = [];

      PdfCropService.getUserTasks.mockReturnValue(mockTasks);

      await PdfCropController.getUserTasks(mockReq, mockRes);

      expect(PdfCropService.getUserTasks).toHaveBeenCalledWith(null, 'visitor123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('handleUploadError', () => {
    it('should handle file size limit error', () => {
      const mockNext = jest.fn();
      const mockError = {
        code: 'LIMIT_FILE_SIZE',
        message: 'File too large',
      };

      PdfCropController.handleUploadError(mockError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: '文件大小超出限制',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle unexpected file error', () => {
      const mockNext = jest.fn();
      const mockError = {
        code: 'LIMIT_UNEXPECTED_FILE',
        message: 'Unexpected field',
      };

      PdfCropController.handleUploadError(mockError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(ErrorCodes.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: '不支持的文件字段',
        })
      );
    });

    it('should call next if no error', () => {
      const mockNext = jest.fn();

      PdfCropController.handleUploadError(null, mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
