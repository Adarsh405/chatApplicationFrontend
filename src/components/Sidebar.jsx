import { useState } from "react";
import {
  FaSearch,
  FaCog,
  FaEllipsisV,
} from "react-icons/fa";

function Sidebar({
  users,
  selectedUser,
  onSelectUser,
}) {
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter((user) =>
    user.name
      .toLowerCase()
      .includes(search.toLowerCase())
  );


  return (
    <div className="sidebar">

      {/* Header */}
      <div className="sidebar-header">

        <div className="logo">
          <div className="logo-icon">
            💬
          </div>

          <h2>Pulse</h2>
        </div>

        <div className="sidebar-actions">
          <FaCog />
          <FaEllipsisV />
        </div>

      </div>


      {/* Search */}
      <div className="search-box">

        <FaSearch />

        <input
          type="text"
          placeholder="Search conversations"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

      </div>


      {/* Users */}
      <div className="users-section">

        <div className="section-title">
          <span>MESSAGES</span>
          <span>{filteredUsers.length}</span>
        </div>


        <div className="users-list">

          {filteredUsers.map((user) => (

            <div
              key={user.id}
              className={`user-item ${
                selectedUser?.id === user.id
                  ? "active"
                  : ""
              }`}
              onClick={() => onSelectUser(user)}
            >

              <div className="avatar-container">

                <img
                  src={
                    user.avatar ||
                    `https://i.pravatar.cc/150?u=${user.id}`
                  }
                  alt={user.name}
                />

                {user.status === "online" && (
                  <span className="online-dot"></span>
                )}

              </div>


              <div className="user-info">

                <h3>{user.name}</h3>

                <p>
                  {user.status === "online"
                    ? "Online"
                    : "Offline"}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>


      {/* Current user */}
      <div className="sidebar-profile">

        <div className="avatar-container">

          <img
            src={`https://i.pravatar.cc/150?u=current`}
            alt="You"
          />

        </div>

        <div>
          <h3>You</h3>
          <span>Available</span>
        </div>

      </div>

    </div>
  );
}

export default Sidebar;