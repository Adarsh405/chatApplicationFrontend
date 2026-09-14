export const users = [
  {
    id: 1,
    name: "Rahul",
    status: "online",
    avatar: "https://i.pravatar.cc/150?img=12",
    lastMessage: "Hey! Are you free today?",
    time: "10:32 AM",
  },
  {
    id: 2,
    name: "Priya",
    status: "online",
    avatar: "https://i.pravatar.cc/150?img=47",
    lastMessage: "How are you?",
    time: "9:45 AM",
  },
  {
    id: 3,
    name: "Arjun",
    status: "offline",
    avatar: "https://i.pravatar.cc/150?img=11",
    lastMessage: "See you tomorrow!",
    time: "Yesterday",
  },
  {
    id: 4,
    name: "Sneha",
    status: "online",
    avatar: "https://i.pravatar.cc/150?img=44",
    lastMessage: "That's great 👍",
    time: "Yesterday",
  },
];

export const messages = [
  {
    id: 1,
    sender: "Rahul",
    text: "Hey! Are you free today?",
    time: "10:32 AM",
    own: false,
  },
  {
    id: 2,
    sender: "You",
    text: "Yes, what's up?",
    time: "10:33 AM",
    own: true,
  },
  {
    id: 3,
    sender: "Rahul",
    text: "I wanted to discuss something with you.",
    time: "10:34 AM",
    own: false,
  },
  {
    id: 4,
    sender: "You",
    text: "Sure! Tell me.",
    time: "10:35 AM",
    own: true,
  },
];