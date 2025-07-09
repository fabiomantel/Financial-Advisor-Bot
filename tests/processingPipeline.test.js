const ProcessingPipeline = require('../services/processingPipeline')
const config = require('../config/config')

const logger = require('../utils/logger')
const { safeSetTimeout } = require('./testUtils')
jest.spyOn(logger, 'info').mockImplementation(() => {})
jest.spyOn(logger, 'debug').mockImplementation(() => {})
jest.spyOn(logger, 'warn').mockImplementation(() => {})
jest.spyOn(logger, 'error').mockImplementation(() => {})

describe('ProcessingPipeline', () => {
  let pipeline
  let mockHistoryManager, mockGptService, mockSendMessage
  beforeEach(() => {
    mockHistoryManager = { getOptimizedContext: jest.fn().mockResolvedValue(['context']) }
    mockGptService = { getResponse: jest.fn().mockImplementation(async (gptRequest, onChunk) => { if (onChunk) { onChunk('chunk1'); onChunk('chunk2') } return 'chunk1chunk2' }) }
    mockSendMessage = jest.fn().mockResolvedValue()
    pipeline = new ProcessingPipeline({
      historyManager: mockHistoryManager,
      gptService: mockGptService,
      sendMessageFn: mockSendMessage
    })
    logger.info.mockClear()
    logger.debug.mockClear()
    logger.warn.mockClear()
    logger.error.mockClear()
  })

  it('should process message with parallel context, GPT, and validation', async () => {
    pipeline.prepareGptRequest = jest.fn().mockResolvedValue(['gptRequest'])
    pipeline.validateMessage = jest.fn().mockResolvedValue({ valid: true })
    pipeline.processGptResponseWithRetry = jest.fn().mockResolvedValue('gpt response')
    pipeline.saveContextAsync = jest.fn().mockResolvedValue()
    const message = { from: 'user1', body: 'Hello', to: 'user1' }
    await pipeline.process(message)
    expect(mockHistoryManager.getOptimizedContext).toHaveBeenCalledWith('user1')
    expect(pipeline.prepareGptRequest).toHaveBeenCalledWith(message)
    expect(pipeline.validateMessage).toHaveBeenCalledWith(message)
    expect(pipeline.processGptResponseWithRetry).toHaveBeenCalledWith(message, ['gptRequest'], ['context'])
  })

  it('should handle validation failure and send error response', async () => {
    pipeline.prepareGptRequest = jest.fn().mockResolvedValue(['gptRequest'])
    pipeline.validateMessage = jest.fn().mockResolvedValue({ valid: false, error: 'Invalid' })
    const message = { from: 'user2', body: '', to: 'user2' }
    await pipeline.process(message)
    expect(mockSendMessage).toHaveBeenCalledWith({ to: 'user2', body: expect.any(String) })
  })

  it('should handle errors and log them', async () => {
    pipeline.prepareGptRequest = jest.fn().mockRejectedValue(new Error('Prepare error'))
    const message = { from: 'user3', body: 'Oops', to: 'user3' }
    await expect(pipeline.process(message)).rejects.toThrow('Prepare error')
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Processing failed'))
  })
})

afterAll(() => {
  jest.restoreAllMocks();
});
