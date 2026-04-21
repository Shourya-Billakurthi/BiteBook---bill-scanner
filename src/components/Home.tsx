import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Camera, Utensils } from 'lucide-react';
import { auth } from '../firebase';

export default function Home({ user }: { user: User }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user.displayName || '');

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

  const firstName = displayName ? displayName.split(' ')[0] : 'User';

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#1A1C23] flex flex-col">
      <header className="bg-[#22252E] p-4 flex items-center justify-between sticky top-0 z-10 border-b border-[#2D313D] shadow-sm">
        {/* Branding */}
        <div className="flex items-center gap-2 cursor-default">
          <div className="w-9 h-9 bg-[#7C6A96]/20 text-[#9E8BB9] rounded-full flex items-center justify-center shadow-inner">
            <Utensils size={18} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">BiteBook</h1>
        </div>

        {/* Profile Button */}
        <button 
          onClick={() => navigate('/profile')}
          className="hover:bg-[#2D313D] p-1.5 rounded-full transition-colors border border-transparent hover:border-[#363A47]"
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#2D313D]" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#7C6A96]/20 flex items-center justify-center text-[#9E8BB9] font-bold text-lg border-2 border-[#2D313D]">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
      </header>

      <main className="flex-1 px-6 pb-6 pt-10 flex flex-col">
        <div className="flex flex-col gap-8 mb-auto text-center">
          <div>
            <p className="text-[#9E8BB9] font-bold text-lg tracking-tight mb-1.5">Hey {firstName}👋</p>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">Scan it. Save the memory!</h2>
            <p className="text-slate-400 font-medium">Remember what you loved, not just where you ate.</p>
          </div>

        <button
          onClick={() => navigate('/scan')}
          className="group relative overflow-hidden bg-gradient-to-br from-[#7C6A96] to-[#5A4B70] text-white rounded-[2rem] p-12 flex flex-col items-center justify-center gap-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all border border-[#8A78A4]/20"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Camera size={64} strokeWidth={1.5} className="relative z-10 drop-shadow-sm" />
          <span className="text-2xl font-extrabold relative z-10">Scan a Bill</span>
        </button>

        <button
          onClick={() => navigate('/previous')}
          className="group relative overflow-hidden bg-[#2A2D39] text-[#E0D4F5] border-2 border-[#3F4454] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md hover:bg-[#363A47] hover:border-[#4B5162] hover:text-white hover:-translate-y-0.5 transition-all"
        >
          <Utensils size={32} className="relative z-10" />
          <span className="text-lg font-bold relative z-10">View Food Memories</span>
        </button>
        </div>
      </main>
    </div>
  );
}
