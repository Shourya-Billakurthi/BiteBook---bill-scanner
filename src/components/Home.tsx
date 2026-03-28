import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Camera, Utensils, LogOut } from 'lucide-react';
import { auth, logout } from '../firebase';

export default function Home({ user }: { user: User }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user.displayName);

  useEffect(() => {
    if (!displayName) {
      // In case the user just registered and updateProfile hasn't propagated
      const checkName = async () => {
        await auth.currentUser?.reload();
        if (auth.currentUser?.displayName) {
          setDisplayName(auth.currentUser.displayName);
        }
      };
      checkName();
    }
  }, [displayName, user]);

  const firstName = displayName ? displayName.split(' ')[0] : 'User';

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#1A1C23] flex flex-col">
      <header className="bg-[#22252E] p-4 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b border-[#2D313D]">
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#7C6A96]/20 flex items-center justify-center text-[#9E8BB9] font-bold text-lg">
              {firstName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-xl font-bold text-white">Welcome {firstName}!</p>
          </div>
        </div>
        <button onClick={logout} className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-full hover:bg-[#2D313D]">
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 p-6 flex flex-col justify-center gap-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">Scan your bills. Save your food memories!</h2>
          <p className="text-slate-400 font-medium">Scan, review and revisit your meals anytime.</p>
        </div>

        <button
          onClick={() => navigate('/scan')}
          className="group relative overflow-hidden bg-[#7C6A96] text-white rounded-2xl p-8 flex flex-col items-center justify-center gap-4 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#8A78A4] to-[#6E5C88] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Camera size={48} className="relative z-10" />
          <span className="text-xl font-bold relative z-10">Scan a Bill</span>
        </button>

        <button
          onClick={() => navigate('/previous')}
          className="group relative overflow-hidden bg-[#2D313D] text-[#9E8BB9] border-2 border-[#9E8BB9] rounded-2xl p-8 flex flex-col items-center justify-center gap-4 shadow-sm hover:shadow-md hover:bg-[#363A47] hover:-translate-y-1 transition-all"
        >
          <Utensils size={48} className="relative z-10" />
          <span className="text-xl font-bold relative z-10">Food Memories</span>
        </button>
      </main>
    </div>
  );
}
