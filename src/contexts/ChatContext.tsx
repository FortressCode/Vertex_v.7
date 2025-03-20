import React, { createContext, useContext, useState, useEffect } from "react";
import {
  ref,
  onValue,
  push,
  set,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
  get,
  remove,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  collection,
  getDocs,
  query as firestoreQuery,
  where,
} from "firebase/firestore";
import { realtimeDb, storage, db } from "../firebase";
import { useAuth } from "./AuthContext";
import { v4 as uuidv4 } from "uuid";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: number;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

interface ChatGroup {
  id: string;
  courseId: string;
  courseName: string;
  createdBy: string;
  createdAt: number;
}

interface ChatContextType {
  chatGroups: ChatGroup[];
  currentChatGroup: ChatGroup | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  setChatGroup: (group: ChatGroup | null) => void;
  createChatGroup: (courseId: string, courseName: string) => Promise<void>;
  deleteGroupChat: (groupId: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  userCanUploadFiles: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, getUserRole } = useAuth();
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [currentChatGroup, setCurrentChatGroup] = useState<ChatGroup | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userCanUploadFiles, setUserCanUploadFiles] = useState<boolean>(false);

  // Load chat groups user has access to
  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);
    const userRole = getUserRole();

    if (userRole === "lecturer") {
      // Lecturers can see chats they created
      const lecturerChatsRef = query(
        ref(realtimeDb, "chatGroups"),
        orderByChild("createdBy"),
        equalTo(currentUser.uid)
      );

      onValue(
        lecturerChatsRef,
        (snapshot) => {
          const groups: ChatGroup[] = [];
          snapshot.forEach((childSnapshot) => {
            groups.push({
              id: childSnapshot.key as string,
              ...childSnapshot.val(),
            });
          });
          setChatGroups(groups);
          setIsLoading(false);
        },
        (error) => {
          setError(error.message);
          setIsLoading(false);
        }
      );
    } else if (userRole === "student") {
      // Get all courses the student is enrolled in
      const fetchStudentChats = async () => {
        try {
          const enrollmentsRef = collection(db, "enrollments");
          const q = firestoreQuery(
            enrollmentsRef,
            where("studentId", "==", currentUser.uid)
          );
          const enrollmentDocs = await getDocs(q);

          // If student has no enrollments, handle this case properly
          if (enrollmentDocs.empty) {
            setChatGroups([]);
            setIsLoading(false);
            return;
          }

          const courseIds = enrollmentDocs.docs.map(
            (doc) => doc.data().courseId
          );

          // Now fetch chat groups for these courses
          const chatGroupsRef = ref(realtimeDb, "chatGroups");
          onValue(
            chatGroupsRef,
            (snapshot) => {
              const groups: ChatGroup[] = [];

              if (!snapshot.exists()) {
                setChatGroups([]);
                setIsLoading(false);
                return;
              }

              snapshot.forEach((childSnapshot) => {
                const chatGroup = childSnapshot.val();
                if (
                  chatGroup &&
                  chatGroup.courseId &&
                  courseIds.includes(chatGroup.courseId)
                ) {
                  groups.push({
                    id: childSnapshot.key as string,
                    ...chatGroup,
                  });
                }
              });
              setChatGroups(groups);
              setIsLoading(false);
            },
            (error) => {
              console.error("Error fetching chat groups:", error);
              setError(error.message);
              setIsLoading(false);
            }
          );
        } catch (error: any) {
          console.error("Error in student chat fetching:", error);
          setError(error.message);
          setIsLoading(false);
        }
      };

      fetchStudentChats();
    }
  }, [currentUser, getUserRole]);

  // Load messages for current chat group
  useEffect(() => {
    if (!currentChatGroup) {
      setMessages([]);
      return;
    }

    const messagesRef = query(
      ref(realtimeDb, `messages/${currentChatGroup.id}`),
      orderByChild("timestamp")
    );

    onValue(messagesRef, (snapshot) => {
      const messageList: ChatMessage[] = [];
      snapshot.forEach((childSnapshot) => {
        messageList.push({
          id: childSnapshot.key as string,
          ...childSnapshot.val(),
        });
      });
      setMessages(messageList);
    });
  }, [currentChatGroup]);

  // Determine if user can upload files (lecturers only)
  useEffect(() => {
    if (!currentUser) return;
    const userRole = getUserRole();
    setUserCanUploadFiles(userRole === "lecturer");
  }, [currentUser, getUserRole]);

  const setChatGroup = (group: ChatGroup | null) => {
    setCurrentChatGroup(group);
  };

  const createChatGroup = async (courseId: string, courseName: string) => {
    if (!currentUser || getUserRole() !== "lecturer") {
      setError("Only lecturers can create chat groups");
      return;
    }

    try {
      const newGroupRef = push(ref(realtimeDb, "chatGroups"));
      await set(newGroupRef, {
        courseId,
        courseName,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const deleteGroupChat = async (groupId: string) => {
    if (!currentUser || getUserRole() !== "lecturer") {
      setError("Only lecturers can delete chat groups");
      return;
    }

    try {
      // First check if this chat group was created by this lecturer
      const chatGroupRef = ref(realtimeDb, `chatGroups/${groupId}`);
      const snapshot = await get(chatGroupRef);

      if (!snapshot.exists()) {
        throw new Error("Chat group not found");
      }

      const chatData = snapshot.val();
      if (chatData.createdBy !== currentUser.uid) {
        throw new Error("You can only delete chat groups you created");
      }

      // Delete messages
      await remove(ref(realtimeDb, `messages/${groupId}`));

      // Delete chat group
      await remove(chatGroupRef);

      // If this was the current chat group, clear it
      if (currentChatGroup && currentChatGroup.id === groupId) {
        setCurrentChatGroup(null);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const sendMessage = async (message: string) => {
    if (!currentUser || !currentChatGroup) return;

    try {
      const newMessageRef = push(
        ref(realtimeDb, `messages/${currentChatGroup.id}`)
      );
      await set(newMessageRef, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "Unknown User",
        senderRole: getUserRole(),
        message,
        timestamp: serverTimestamp(),
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const uploadFile = async (file: File) => {
    if (!currentUser || !currentChatGroup || getUserRole() !== "lecturer") {
      setError("Only lecturers can upload files");
      return;
    }

    try {
      const fileName = `${uuidv4()}-${file.name}`;
      const fileRef = storageRef(
        storage,
        `chat-files/${currentChatGroup.id}/${fileName}`
      );

      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      const newMessageRef = push(
        ref(realtimeDb, `messages/${currentChatGroup.id}`)
      );
      await set(newMessageRef, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "Unknown User",
        senderRole: getUserRole(),
        message: `Shared a file: ${file.name}`,
        fileUrl: downloadURL,
        fileName: file.name,
        fileType: file.type,
        timestamp: serverTimestamp(),
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chatGroups,
        currentChatGroup,
        messages,
        isLoading,
        error,
        setChatGroup,
        createChatGroup,
        deleteGroupChat,
        sendMessage,
        uploadFile,
        userCanUploadFiles,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
