/* eslint-disable */
/**
 * This file was automatically generated.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file.
 */

/**
 * SSOT contract for bidirectional WebSocket communication protocol
 */
export type WSMessage =
  | C2SPing
  | C2SSendMessage
  | C2STriggerAction
  | S2CPong
  | S2CAgentStatus
  | S2CMessageChunk
  | S2CMessageComplete
  | S2CError
  | S2CActionStatus
  | S2CActionResult;

/** @deprecated Use WSMessage instead */
export type AgentHubWebSocketMessages =
  | C2SPing
  | C2SSendMessage
  | C2STriggerAction
  | S2CPong
  | S2CAgentStatus
  | S2CMessageChunk
  | S2CMessageComplete
  | S2CError
  | S2CActionStatus
  | S2CActionResult;

export interface C2SPing {
  /**
   * Message type discriminator
   */
  type: "ping";
  /**
   * Client send timestamp in ISO 8601
   */
  timestamp: string;
}
export interface C2SSendMessage {
  /**
   * Message type discriminator
   */
  type: "sendMessage";
  /**
   * Client send timestamp in ISO 8601
   */
  timestamp: string;
  payload: {
    /**
     * Target session ID
     */
    sessionId: string;
    /**
     * User message content
     */
    content: string;
    /**
     * Optional ID of the message being replied to
     */
    replyToId?: string;
  };
}
export interface C2STriggerAction {
  /**
   * Message type discriminator
   */
  type: "triggerAction";
  /**
   * Client send timestamp in ISO 8601
   */
  timestamp: string;
  payload: {
    /**
     * Target message ID containing the action
     */
    messageId: string;
    /**
     * Action type triggered by user
     */
    actionType: "applyDiff" | "retry" | "pin";
    /**
     * Variable-length action parameters
     */
    payload?: {
      [k: string]: unknown;
    };
  };
}
export interface S2CPong {
  /**
   * Message type discriminator
   */
  type: "pong";
  /**
   * Server response timestamp in ISO 8601
   */
  timestamp: string;
}
export interface S2CAgentStatus {
  /**
   * Message type discriminator
   */
  type: "agentStatus";
  /**
   * Server push timestamp in ISO 8601
   */
  timestamp: string;
  payload: {
    /**
     * Session context
     */
    sessionId: string;
    /**
     * Agent reporting status
     */
    agentId: string;
    /**
     * Current agent execution or connection status
     */
    status: "analyzing" | "executing" | "completed" | "failed" | "online" | "offline" | "busy" | "error";
    /**
     * Human-readable status message
     */
    displayText: string;
  };
}
export interface S2CMessageChunk {
  /**
   * Message type discriminator
   */
  type: "messageChunk";
  /**
   * Server push timestamp in ISO 8601
   */
  timestamp: string;
  payload: {
    /**
     * Unique message identifier for chunk assembly
     */
    messageId: string;
    /**
     * Session context
     */
    sessionId: string;
    /**
     * Agent generating this chunk
     */
    agentId: string;
    /**
     * Content type for frontend rendering dispatch
     */
    chunkType: "text" | "code_diff" | "web_preview" | "deploy_status" | "tool_status";
    /**
     * Incremental text content for this chunk
     */
    deltaContent: string;
    /**
     * Zero-based chunk sequence number
     */
    chunkIndex: number;
    /**
     * Whether this is the last chunk for this message
     */
    isFinal: boolean;
  };
}
export interface S2CMessageComplete {
  /**
   * Message type discriminator
   */
  type: "messageComplete";
  /**
   * Server push timestamp in ISO 8601
   */
  timestamp: string;
  payload: Message;
}
/**
 * Complete Message entity from entities.json
 */
export interface Message {
  /**
   * Unique identifier for the message
   */
  id: string;
  /**
   * Foreign key to the parent session
   */
  sessionId: string;
  /**
   * Type of the sender
   */
  senderType: "user" | "agent";
  /**
   * User ID or Agent ID of the sender
   */
  senderId: string;
  /**
   * Text or markdown content
   */
  content: string;
  /**
   * Content type classification
   */
  contentType: "text" | "markdown" | "card" | "image" | "file";
  /**
   * Structured artifact data, required when contentType is 'card'
   */
  cardData?: {
    /**
     * Static code snippet display
     */
    codeBlock?: {
      /**
       * Programming language identifier
       */
      language: string;
      /**
       * Code content
       */
      code: string;
      /**
       * Code block title or filename
       */
      title: string;
    };
    /**
     * Code diff artifact with hunks and apply status
     */
    diffBlock?: {
      /**
       * Target file path
       */
      filename: string;
      /**
       * Programming language for syntax highlighting
       */
      language: string;
      /**
       * Number of added lines
       */
      additions: number;
      /**
       * Number of deleted lines
       */
      deletions: number;
      /**
       * Array of diff hunks
       */
      hunks: DiffHunk[];
      /**
       * Current apply status of the diff
       */
      status: "pending" | "applied" | "rejected";
    };
    /**
     * Web preview artifact for iframe sandbox rendering
     */
    previewBlock?: {
      /**
       * HTML content for preview
       */
      html: string;
      /**
       * CSS styles for preview
       */
      css?: string;
      /**
       * JavaScript for preview interactivity
       */
      js?: string;
      /**
       * Preview viewport preset
       */
      viewport: "mobile" | "tablet" | "desktop";
    };
    /**
     * Deployment status artifact with progress tracking
     */
    deployBlock?: {
      /**
       * Current deployment status
       */
      status: "queued" | "building" | "deploying" | "live" | "failed";
      /**
       * Deployment progress percentage
       */
      progress: number;
      /**
       * Live preview URL after successful deployment
       */
      previewUrl?: string | null;
      /**
       * Deployment log entries
       */
      logs: DeployLogEntry[];
    };
    /**
     * File or image attachment metadata
     */
    fileAttachment?: {
      /**
       * File download URL
       */
      url: string;
      /**
       * Original filename
       */
      filename: string;
      /**
       * File size in bytes
       */
      size: number;
      /**
       * MIME type of the file
       */
      mimeType: string;
    };
  };
  /**
   * Creation timestamp in ISO 8601 format
   */
  createdAt: string;
  /**
   * ID of the message being replied to
   */
  replyToId?: string | null;
  /**
   * Whether the message is pinned
   */
  isPinned?: boolean;
}
export interface DiffHunk {
  /**
   * Starting line number in the original file (0 for new file creation)
   */
  oldStart: number;
  /**
   * Number of lines in the original file for this hunk
   */
  oldLines: number;
  /**
   * Starting line number in the modified file
   */
  newStart: number;
  /**
   * Number of lines in the modified file for this hunk
   */
  newLines: number;
  /**
   * New content to replace the old lines
   */
  content: string;
  /**
   * Expected old content for verification before applying
   */
  oldContent?: string;
}
export interface DeployLogEntry {
  /**
   * Log entry timestamp in ISO 8601 format
   */
  timestamp: string;
  /**
   * Log severity level
   */
  level: "info" | "warn" | "error";
  /**
   * Log message content
   */
  message: string;
}
export interface S2CError {
  /**
   * Message type discriminator
   */
  type: "error";
  /**
   * Server push timestamp in ISO 8601
   */
  timestamp: string;
  payload: {
    /**
     * Session context where error occurred
     */
    sessionId: string;
    /**
     * Machine-readable error classification
     */
    errorCode: string;
    /**
     * Human-readable error description
     */
    errorMessage: string;
    /**
     * Whether client can retry the operation
     */
    recoverable: boolean;
  };
}
export interface S2CActionStatus {
  /**
   * Message type discriminator
   */
  type: "actionStatus";
  /**
   * Server push timestamp in ISO 8601
   */
  timestamp: string;
  payload: {
    /**
     * Session context
     */
    sessionId: string;
    /**
     * Target message ID
     */
    messageId: string;
    /**
     * Action being executed
     */
    actionType: "applyDiff" | "retry" | "pin";
    /**
     * Current action execution status
     */
    status: "applying" | "pending";
  };
}
export interface S2CActionResult {
  /**
   * Message type discriminator
   */
  type: "actionResult";
  /**
   * Server push timestamp in ISO 8601
   */
  timestamp: string;
  payload: {
    /**
     * Session context
     */
    sessionId: string;
    /**
     * Target message ID
     */
    messageId: string;
    /**
     * Action that was executed
     */
    actionType: "applyDiff" | "retry" | "pin";
    /**
     * Final action result status
     */
    status: "applied" | "rejected" | "failed";
    /**
     * Human-readable result detail
     */
    detail: string;
  };
}
