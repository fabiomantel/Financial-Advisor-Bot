const MessageQueue = require('../services/messageQueue');
const SmartHistoryManager = require('../services/historyManager');
const FallbackGptService = require('../services/fallbackGptService');
const { sendMessage } = require('../services/messagingService');
const config = require('../config/config');

jest.mock('../services/historyManager');
jest.mock('../services/fallbackGptService');
jest.mock('../services/messagingService');

const logger = require('../utils/logger');
jest.spyOn(logger, 'info').mockImplementation(() => {});
jest.spyOn(logger, 'debug').mockImplementation(() => {});
jest.spyOn(logger, 'warn').mockImplementation(() => {});
jest.spyOn(logger, 'error').mockImplementation(() => {});

describe('MessageQueue', () => {
  let queue;
  let mockHistoryManager, mockGptService, mockSendMessage;
  beforeEach(() => {
    mockHistoryManager = { getOptimizedContext: jest.fn().mockResolvedValue([{ role: 'user', content: 'test' }]) };
    mockGptService = { getResponse: jest.fn().mockResolvedValue('gpt reply') };
    mockSendMessage = jest.fn().mockResolvedValue();
    // Mock splitMessageOnWordBoundary to always return one chunk
    const messagingService = require('../services/messagingService');
    messagingService.splitMessageOnWordBoundary.mockImplementation((msg, len) => [msg]);
    queue = new MessageQueue(config, {
      historyManager: mockHistoryManager,
      gptService: mockGptService,
      sendMessageFn: mockSendMessage
    });
    logger.info.mockClear();
    logger.debug.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
  });

  function flushPromises() {
    return new Promise(setImmediate);
  }

  it('should enqueue a message and trigger processing', async () => {
    const message = { from: 'user1', to: 'user1', body: 'Hello' };
    await queue.enqueue(message);
    expect(queue.queue.length).toBe(0); // Should process immediately
  });

  it('should send the GPT response when processing', async () => {
    mockGptService.getResponse.mockResolvedValueOnce('A'.repeat(100) + '.');
    const message = { from: 'user2', to: 'user2', body: 'Hi' };
    await queue.enqueue(message);
    await flushPromises();
    expect(mockSendMessage).toHaveBeenCalledWith({ to: 'user2', body: expect.any(String) });
  });

  it('should trigger parallel context and GPT processing', async () => {
    const message = { from: 'user3', to: 'user3', body: 'Test' };
    await queue.enqueue(message);
    // Wait for the async processNext to complete
    await new Promise(setImmediate);
    expect(mockHistoryManager.getOptimizedContext).toHaveBeenCalledWith('user3', 'Test');
    expect(mockGptService.getResponse).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Test' }],
      null
    );
  });

  it('should handle errors and log them', async () => {
    mockSendMessage.mockRejectedValueOnce(new Error('Send failed'));
    const message = { from: 'user4', to: 'user4', body: 'Oops' };
    await queue.enqueue(message);
    await flushPromises();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send chunk'));
  });
}); 