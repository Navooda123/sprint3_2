import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, MapPin } from 'lucide-react';

const sriLankanProvinces = [
  'Western', 'Central', 'Southern', 'Northern', 'Eastern',
  'North Western', 'North Central', 'Uva', 'Sabaragamuwa'
];

const sriLankanDistricts = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Moneragala', 'Ratnapura', 'Kegalle'
];

const sriLankanBanks = [
  'Bank of Ceylon', "People's Bank", 'Commercial Bank',
  'Sampath Bank', 'Hatton National Bank (HNB)'
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'Retailer',
    nic: '', province: '', district: '', phone: '',
    bankName: '', bankAccount: '', accountHolder: '',
    farmType: '', vehicleRegistration: '', address: '',
    outletName: '', managerName: '', lat: null, lng: null,
    companyName: '', driverName: '', coverageDistricts: [],
    shopName: '', ownerName: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    if (e.target.name === 'coverageDistricts') {
      const options = Array.from(e.target.selectedOptions, option => option.value);
      setFormData({ ...formData, coverageDistricts: options });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setLoading(true);

    try {
      let submitData = { ...formData };
      if (submitData.role === 'Outlet') {
        submitData.name = `${submitData.outletName} (Manager: ${submitData.managerName})`;
      } else if (submitData.role === 'Distributor') {
        submitData.name = `${submitData.companyName} (Manager: ${submitData.managerName}, Driver: ${submitData.driverName})`;
        submitData.district = submitData.coverageDistricts.join(', ');
      } else if (submitData.role === 'Retailer') {
        submitData.name = `${submitData.shopName} (Owner: ${submitData.ownerName})`;
      }

      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const data = await res.json();

      if (res.ok) {
        login(data);
        toast.success(`Account created successfully!`);
        navigate(`/${data.role.toLowerCase()}`);
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px' }}>
        <div className="text-center mb-4">
          <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Nestlé Lanka Connect</h1>
          <p className="text-muted">Create your local account</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            {formData.role === 'Outlet' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Outlet Name</label>
                  <input type="text" name="outletName" className="form-control" value={formData.outletName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Manager Name</label>
                  <input type="text" name="managerName" className="form-control" value={formData.managerName} onChange={handleChange} required />
                </div>
              </>
            ) : formData.role === 'Distributor' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input type="text" name="companyName" className="form-control" value={formData.companyName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Manager Name</label>
                  <input type="text" name="managerName" className="form-control" value={formData.managerName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Driver Name</label>
                  <input type="text" name="driverName" className="form-control" value={formData.driverName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Registration No.</label>
                  <input type="text" name="vehicleRegistration" className="form-control" placeholder="WP-CAB-1234" value={formData.vehicleRegistration} onChange={handleChange} required />
                </div>
              </>
            ) : formData.role === 'Retailer' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Shop Name</label>
                  <input type="text" name="shopName" className="form-control" value={formData.shopName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input type="text" name="ownerName" className="form-control" value={formData.ownerName} onChange={handleChange} required />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">Full Name / Business Name</label>
                <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" name="email" className="form-control" value={formData.email} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password" 
                  className="form-control" 
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="confirmPassword" 
                  className="form-control" 
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select name="role" className="form-control" value={formData.role} onChange={handleChange}>
                <option value="Admin">Factory Admin</option>
                <option value="Farmer">Farmer</option>
                <option value="Distributor">Distributor</option>
                <option value="Outlet">Nestlé Outlet</option>
                <option value="Retailer">Retailer</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Phone (+94)</label>
              <input type="text" name="phone" className="form-control" placeholder="+94 77 123 4567" value={formData.phone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">NIC</label>
              <input type="text" name="nic" className="form-control" placeholder="e.g. 199012345678" value={formData.nic} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label">Province</label>
              <select name="province" className="form-control" value={formData.province} onChange={handleChange} required={formData.role !== 'Distributor'}>
                <option value="">Select Province</option>
                {sriLankanProvinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            
            {formData.role === 'Distributor' ? (
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">District Coverage (Hold Ctrl/Cmd to select multiple)</label>
                <select name="coverageDistricts" className="form-control" multiple value={formData.coverageDistricts} onChange={handleChange} required style={{ height: '120px' }}>
                  {sriLankanDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">District / City</label>
                <input type="text" name="district" className="form-control" placeholder="e.g. Colombo, Kurunegala" value={formData.district} onChange={handleChange} required />
              </div>
            )}
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Street Address</label>
            <input type="text" name="address" className="form-control" placeholder="123 Main Street" value={formData.address} onChange={handleChange} required />
          </div>

          {/* Role-specific Fields */}
          {(formData.role === 'Outlet' || formData.role === 'Retailer') && (
            <div className="form-group mt-3">
              <label className="form-label">Location</label>
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  className="btn btn-outline flex items-center gap-2"
                  onClick={() => {
                    setFormData({ ...formData, lat: 6.9271, lng: 79.8612 });
                    toast.success('GPS Pin set to current location (Colombo)');
                  }}
                >
                  <MapPin size={18} /> Drop GPS Pin on Map
                </button>
                {formData.lat && <span className="text-muted" style={{ fontSize: '0.85rem' }}>✓ Location pinned</span>}
              </div>
            </div>
          )}

          {formData.role === 'Farmer' && (
            <div className="form-group mt-3">
              <label className="form-label">Farm Type / Main Supply</label>
              <select name="farmType" className="form-control" value={formData.farmType} onChange={handleChange} required>
                <option value="">Select Supply</option>
                <option value="Dairy">Fresh cow milk</option>
                <option value="Coconut">Coconut</option>
                <option value="Spices">Spices (Cinnamon, Cardamom)</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          {/* Bank Details (For those who receive or make payments) */}
          {['Farmer', 'Retailer', 'Distributor'].includes(formData.role) && (
            <div className="mt-4 p-3" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-color)' }}>
              <h4 className="mb-2" style={{ fontSize: '0.9rem' }}>Bank Details (Sri Lanka)</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <select name="bankName" className="form-control" value={formData.bankName} onChange={handleChange} required>
                    <option value="">Select Bank</option>
                    {sriLankanBanks.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <input type="text" name="bankAccount" className="form-control" placeholder="Account Number" value={formData.bankAccount} onChange={handleChange} required />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <input type="text" name="accountHolder" className="form-control" placeholder="Account Holder Name" value={formData.accountHolder} onChange={handleChange} required />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
            {loading ? 'Registering...' : 'Register Account'}
          </button>
        </form>
        <div className="text-center mt-3">
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            Already have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => navigate('/login')}>Login</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
