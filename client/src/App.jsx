import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import { RequireAdmin, RequireAuth } from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Designs from './pages/Designs.jsx';
import Services from './pages/Services.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import BookSelect from './pages/BookSelect.jsx';
import Booking from './pages/Booking.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminLogin from './admin/AdminLogin.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminDashboard from './admin/Dashboard.jsx';
import AdminAppointments from './admin/Appointments.jsx';
import AdminCalendar from './admin/Calendar.jsx';
import AdminDesigns from './admin/Designs.jsx';
import AdminCustomers from './admin/Customers.jsx';
import AdminSettings from './admin/Settings.jsx';
import { useSiteData } from './hooks/useSiteData.js';

function Layout() {
  const { settings, hours } = useSiteData();
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route index element={<Home settings={settings} hours={hours} />} />
          <Route path="designs" element={<Designs />} />
          <Route path="services" element={<Services />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact settings={settings} hours={hours} />} />
          <Route path="book" element={<BookSelect />} />
          <Route path="book/:designId" element={<Booking />} />
          <Route path="login" element={<AuthPage mode="login" />} />
          <Route path="signup" element={<AuthPage mode="signup" />} />
          <Route path="forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="reset-password" element={<AuthPage mode="reset" />} />
          <Route
            path="dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
      <Footer settings={settings} hours={hours} />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<Layout />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="designs" element={<AdminDesigns />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}
