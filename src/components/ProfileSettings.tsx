import { useEffect, useState } from 'react';
import { User, updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Loader2, Save, Key, ChevronRight, ChevronLeft, Eye, EyeOff, Lock, Trash2, AlertTriangle, X } from 'lucide-react';
import { auth, logout } from '../firebase';

export default function ProfileSettings({ user }: { user: User }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [activeTab, setActiveTab] = useState<'menu' | 'profile' | 'password'>('menu');
  
  // Profile Form State
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');
  
  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Delete Account State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!displayName && user.displayName) {
      setDisplayName(user.displayName);
    } else if (!displayName) {
      const checkName = async () => {
        await auth.currentUser?.reload();
        if (auth.currentUser?.displayName) {
          setDisplayName(auth.currentUser.displayName);
        }
      };
      checkName();
    }
  }, [displayName, user]);

  useEffect(() => {
    // Initialize form fields when entering the profile tab
    if (activeTab === 'profile') {
      const names = (displayName || '').split(' ');
      setFirstNameInput(names[0] || '');
      setLastNameInput(names.slice(1).join(' ') || '');
    }
  }, [activeTab, displayName]);

  const handleUpdateProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage({ type: '', text: '' });
    try {
      if (!firstNameInput.trim()) {
        setProfileMessage({ type: 'error', text: 'First name is required.' });
        setIsSavingProfile(false);
        return;
      }

      const newDisplayName = `${firstNameInput.trim()} ${lastNameInput.trim()}`.trim();
      
      if (newDisplayName !== displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newDisplayName });
        setDisplayName(newDisplayName);
      }

      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        setActiveTab('menu');
        setProfileMessage({ type: '', text: '' });
      }, 1500);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setProfileMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    setProfileMessage({ type: '', text: '' });
    
    if (!currentPassword) {
      setProfileMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setProfileMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setProfileMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setIsSavingProfile(true);
    try {
      if (auth.currentUser && auth.currentUser.email) {
        // Re-authenticate
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        
        // Update password
        await updatePassword(auth.currentUser, newPassword);
        
        setProfileMessage({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setActiveTab('menu');
          setProfileMessage({ type: '', text: '' });
        }, 1500);
      } else {
        throw new Error('User email not found.');
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setProfileMessage({ type: 'error', text: 'Incorrect current password.' });
      } else if (error.code === 'auth/too-many-requests') {
        setProfileMessage({ type: 'error', text: 'Too many failed attempts. Please try again later.' });
      } else {
        setProfileMessage({ type: 'error', text: error.message || 'Failed to update password. You may have signed in with Google.' });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    setIsDeleting(true);
    setProfileMessage({ type: '', text: '' });
    try {
      await deleteUser(auth.currentUser);
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account', error);
      if (error.code === 'auth/requires-recent-login') {
        setProfileMessage({ type: 'error', text: 'For security purposes, please log out and log back in before deleting your account.' });
      } else {
        setProfileMessage({ type: 'error', text: error.message || 'Failed to delete account.' });
      }
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com') && !user.providerData.some(p => p.providerId === 'password');

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#1A1C23] flex flex-col">
      <header className="bg-[#22252E] p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10 border-b border-[#2D313D]">
        <button 
          onClick={() => {
            if (activeTab !== 'menu') {
              setActiveTab('menu');
              setProfileMessage({type: '', text: ''});
            } else {
              navigate(-1);
            }
          }} 
          className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-[#2D313D]"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          {activeTab === 'menu' && 'Profile Settings'}
          {activeTab === 'profile' && 'Profile Information'}
          {activeTab === 'password' && 'Change Password'}
        </h1>
      </header>

      <main className="flex-1 p-4">
        {activeTab === 'menu' && (
          <div className="flex flex-col gap-3 mt-4">
            <button 
              onClick={() => { setActiveTab('profile'); setProfileMessage({type: '', text: ''}); }} 
              className="flex items-center justify-between p-4 bg-[#22252E] hover:bg-[#2D313D] rounded-xl transition-colors border border-[#2D313D] group shadow-sm"
            >
              <div className="flex items-center gap-3 text-white font-bold">
                <UserIcon size={20} className="text-[#9E8BB9] group-hover:text-white transition-colors" /> 
                Profile Information
              </div>
              <ChevronRight size={20} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
            
            {!isGoogleUser && (
              <button 
                onClick={() => { setActiveTab('password'); setProfileMessage({type: '', text: ''}); }} 
                className="flex items-center justify-between p-4 bg-[#22252E] hover:bg-[#2D313D] rounded-xl transition-colors border border-[#2D313D] group shadow-sm"
              >
                <div className="flex items-center gap-3 text-white font-bold">
                  <Lock size={20} className="text-[#9E8BB9] group-hover:text-white transition-colors" /> 
                  Change Password
                </div>
                <ChevronRight size={20} className="text-slate-500 group-hover:text-white transition-colors" />
              </button>
            )}

            <button 
              onClick={() => { logout(); navigate('/'); }} 
              className="flex items-center justify-between p-4 bg-[#22252E] hover:bg-[#2D313D] rounded-xl transition-colors border border-[#2D313D] group shadow-sm mt-2"
            >
              <div className="flex items-center gap-3 text-slate-400 group-hover:text-white font-bold transition-colors">
                <LogOut size={20} /> 
                Log Out
              </div>
            </button>

            {profileMessage.text && activeTab === 'menu' && (
              <div className={`p-3 rounded-xl text-sm font-bold text-center ${profileMessage.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                {profileMessage.text}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">First Name</label>
              <input
                type="text"
                value={firstNameInput}
                onChange={(e) => setFirstNameInput(e.target.value)}
                className="w-full bg-[#22252E] text-white font-bold p-3 rounded-xl border border-[#2D313D] focus:border-[#7C6A96] focus:outline-none shadow-sm"
                placeholder="First Name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">Last Name</label>
              <input
                type="text"
                value={lastNameInput}
                onChange={(e) => setLastNameInput(e.target.value)}
                className="w-full bg-[#22252E] text-white font-bold p-3 rounded-xl border border-[#2D313D] focus:border-[#7C6A96] focus:outline-none shadow-sm"
                placeholder="Last Name"
              />
            </div>

            {profileMessage.text && (
              <div className={`p-3 rounded-xl text-sm font-bold text-center ${profileMessage.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                {profileMessage.text}
              </div>
            )}

            <button
              onClick={handleUpdateProfile}
              disabled={isSavingProfile}
              className="w-full bg-[#7C6A96] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#8A78A4] disabled:opacity-70 transition-colors mt-4 shadow-md text-lg"
            >
              {isSavingProfile ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </button>

            <div className="mt-8 pt-6 border-t border-[#2D313D]">
              <button 
                onClick={() => { setProfileMessage({type: '', text: ''}); setShowDeleteConfirm(true); }} 
                className="w-full flex items-center justify-center gap-2 p-4 bg-orange-500/10 hover:bg-orange-500/20 rounded-xl transition-colors border border-orange-500/20 group shadow-sm"
              >
                <Trash2 size={20} className="text-orange-400 group-hover:scale-110 transition-transform" /> 
                <span className="text-orange-400 font-bold">Delete Account</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">Current Password</label>
              <div className="relative">
                <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[#22252E] text-white font-bold p-3 pl-10 pr-10 rounded-xl border border-[#2D313D] focus:border-[#7C6A96] focus:outline-none placeholder-slate-600 shadow-sm"
                  placeholder="Current Password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowCurrent(!showCurrent)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">New Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#22252E] text-white font-bold p-3 pl-10 pr-10 rounded-xl border border-[#2D313D] focus:border-[#7C6A96] focus:outline-none placeholder-slate-600 shadow-sm"
                  placeholder="New Password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowNew(!showNew)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">Retype New Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#22252E] text-white font-bold p-3 pl-10 pr-10 rounded-xl border border-[#2D313D] focus:border-[#7C6A96] focus:outline-none placeholder-slate-600 shadow-sm"
                  placeholder="Retype New Password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirm(!showConfirm)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {profileMessage.text && (
              <div className={`p-3 rounded-xl text-sm font-bold text-center ${profileMessage.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                {profileMessage.text}
              </div>
            )}

            <button
              onClick={handleUpdatePassword}
              disabled={isSavingProfile}
              className="w-full bg-[#7C6A96] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#8A78A4] disabled:opacity-70 transition-colors mt-4 shadow-md text-lg"
            >
              {isSavingProfile ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
              {isSavingProfile ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        )}
      </main>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#22252E] rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[#2D313D] shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white">Delete Account?</h3>
            <p className="text-slate-400 font-medium leading-relaxed">
              Are you sure you want to delete your account? This action is permanent and cannot be undone. All your food memories will be lost forever.
            </p>
            <div className="flex flex-col gap-3 w-full mt-4">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={20} className="animate-spin" /> : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="w-full bg-[#2D313D] hover:bg-[#363A47] text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
