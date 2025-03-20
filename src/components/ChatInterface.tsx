import React, { useState, useRef, useEffect } from "react";
import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import moment from "moment";

// Custom CSS for the clickable div that replaces the button
const clickableItemStyle: React.CSSProperties = {
  cursor: "pointer",
  userSelect: "none",
};

const ChatInterface: React.FC = () => {
  const {
    chatGroups,
    currentChatGroup,
    messages,
    setChatGroup,
    sendMessage,
    uploadFile,
    deleteGroupChat,
    userCanUploadFiles,
  } = useChat();
  const { currentUser, getUserRole } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleFileUpload = async () => {
    if (selectedFile && userCanUploadFiles) {
      await uploadFile(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDeleteConfirm = (groupId: string) => {
    setShowDeleteConfirm(groupId);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  const handleDeleteGroup = async (groupId: string) => {
    await deleteGroupChat(groupId);
    setShowDeleteConfirm(null);
  };

  const isLecturer = getUserRole() === "lecturer";

  // Format timestamp
  const formatTime = (timestamp: number | null | undefined) => {
    if (!timestamp) return "Just now";

    try {
      return moment(timestamp).format("MMM D, YYYY h:mm A");
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Unknown time";
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="row g-0">
        {/* Chat Groups Sidebar */}
        <div className="col-md-3 border-end" style={{ height: "80vh" }}>
          <div className="p-3 bg-light">
            <h5 className="mb-3">Course Chats</h5>
            <div className="list-group">
              {chatGroups.length > 0 ? (
                chatGroups.map((group) => (
                  <div key={group.id} className="position-relative mb-2">
                    <div
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${
                        currentChatGroup?.id === group.id ? "active" : ""
                      }`}
                      onClick={() => setChatGroup(group)}
                      role="button"
                      tabIndex={0}
                      style={clickableItemStyle}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setChatGroup(group);
                        }
                      }}
                    >
                      <div className="w-100 me-2 chat-group-name">
                        {group.courseName}
                      </div>
                      {isLecturer && (
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            currentChatGroup?.id === group.id
                              ? "btn-light"
                              : "btn-outline-danger"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConfirm(group.id);
                          }}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </div>

                    {/* Delete confirmation */}
                    {showDeleteConfirm === group.id && (
                      <div className="position-absolute top-100 start-0 end-0 bg-white border rounded shadow p-2 z-index-dropdown mt-1">
                        <p className="mb-2 small">Delete this chat group?</p>
                        <div className="d-flex justify-content-between">
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            Delete
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={handleDeleteCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-chat-square-text fs-4 text-muted mb-2"></i>
                  <p className="text-muted mb-0">No chat groups available</p>
                  <small className="text-muted d-block mt-2">
                    {isLecturer
                      ? "You haven't created any chat groups yet."
                      : "You need to be enrolled in courses to see their chat groups."}
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="col-md-9 d-flex flex-column" style={{ height: "80vh" }}>
          {currentChatGroup ? (
            <>
              {/* Chat Header */}
              <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{currentChatGroup.courseName} Chat</h5>
                {isLecturer && (
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDeleteConfirm(currentChatGroup.id)}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Delete Chat
                  </button>
                )}
              </div>

              {/* Messages Area */}
              <div
                className="flex-grow-1 p-3 overflow-auto"
                style={{ maxHeight: "calc(80vh - 130px)" }}
              >
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isCurrentUser = currentUser?.uid === msg.senderId;
                    return (
                      <div
                        key={msg.id}
                        className={`mb-3 d-flex ${
                          isCurrentUser
                            ? "justify-content-end"
                            : "justify-content-start"
                        }`}
                      >
                        <div
                          className={`p-3 rounded-3 ${
                            isCurrentUser ? "bg-primary text-white" : "bg-light"
                          }`}
                          style={{ maxWidth: "75%" }}
                        >
                          <div className="small mb-1">
                            <strong>
                              {isCurrentUser ? "You" : msg.senderName}
                            </strong>
                            <span className="ms-2 text-opacity-75">
                              ({msg.senderRole})
                            </span>
                          </div>
                          <div>{msg.message}</div>

                          {/* File attachment link */}
                          {msg.fileUrl && (
                            <div className="mt-2">
                              <a
                                href={msg.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`btn btn-sm ${
                                  isCurrentUser ? "btn-light" : "btn-primary"
                                }`}
                              >
                                <i className="bi bi-file-earmark me-1"></i>
                                {msg.fileName}
                              </a>
                            </div>
                          )}

                          <div className="small mt-1 text-opacity-75">
                            {formatTime(msg.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-muted p-4">
                    No messages yet. Be the first to start the conversation!
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-3 border-top">
                <form
                  onSubmit={handleSendMessage}
                  className="d-flex flex-column"
                >
                  <div className="d-flex">
                    <input
                      type="text"
                      className="form-control me-2"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                      <i className="bi bi-send"></i>
                    </button>
                  </div>

                  {/* File Upload (Lecturers Only) */}
                  {userCanUploadFiles && (
                    <div className="mt-2 d-flex align-items-center">
                      <input
                        type="file"
                        className="form-control form-control-sm me-2"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={handleFileUpload}
                        disabled={!selectedFile}
                      >
                        <i className="bi bi-upload me-1"></i>
                        Upload
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </>
          ) : (
            <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted">
              <i className="bi bi-chat-dots fs-1 mb-3"></i>
              <p className="mb-2">Select a chat group to start messaging</p>
              {chatGroups.length === 0 && (
                <div className="text-center">
                  <small className="d-block text-muted">
                    {isLecturer
                      ? "You need to create a chat group first."
                      : "No chat groups are available for your courses."}
                  </small>
                  {!isLecturer && (
                    <div className="alert alert-info mt-3 small" role="alert">
                      <i className="bi bi-info-circle me-2"></i>
                      Chat groups are created by lecturers. If you're enrolled
                      in courses but don't see any chats, ask your lecturer to
                      create one.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
