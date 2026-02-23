import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
// Importing pages
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';
import Signup from './pages/Signup';
import Login from './pages/Login';


const App = () => {

  return(
    <>
  <Router>
    <Toaster position="top-center" />

    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  </Router>
    
    </>
  )
}

export default App