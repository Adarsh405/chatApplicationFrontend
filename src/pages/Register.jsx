import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
} from "react-icons/fa";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed"
        );
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      navigate("/home");

    } catch (error) {
      setError(error.message);

    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-page">

      {/* Animated background */}
      <div className="auth-orb orb-one"></div>
      <div className="auth-orb orb-two"></div>
      <div className="auth-orb orb-three"></div>

      <div className="auth-card register-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            💬
          </div>

          <span>Pulse</span>
        </div>


        <div className="auth-heading">
          <h1>Create your account</h1>

          <p>
            Join Pulse and start connecting
          </p>
        </div>


        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}


        <form onSubmit={handleRegister}>

          {/* Name */}
          <div className="auth-field">

            <FaUser />

            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

          </div>


          {/* Email */}
          <div className="auth-field">

            <FaEnvelope />

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

          </div>


          {/* Password */}
          <div className="auth-field">

            <FaLock />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Create password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(!showPassword)
              }
            >
              {showPassword ? (
                <FaEyeSlash />
              ) : (
                <FaEye />
              )}
            </button>

          </div>


          {/* Register */}
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <span className="button-loader"></span>
            ) : (
              <>
                Create account
                <FaArrowRight />
              </>
            )}
          </button>

        </form>


        <div className="auth-divider">
          <span>OR</span>
        </div>


        <p className="auth-switch">
          Already have an account?

          <Link to="/login">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Register;