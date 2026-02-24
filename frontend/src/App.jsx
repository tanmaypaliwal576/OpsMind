import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
// Importing pages
import Chat from './pages/Chat';
import Signup from './pages/Signup';
import Login from './pages/Login';
import AdminAnalytics from "./pages/AdminAnalytics";


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
      <Route path="/admin/analytics" element={<AdminAnalytics />} />
    </Routes>
  </Router>
    
    </>
  )
}

export default App