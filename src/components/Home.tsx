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
      <header className="bg-[#22252E] p-4 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b border-[#2D313D]">
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 hover:bg-[#2D313D] p-2 rounded-xl transition-colors text-left"
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#7C6A96]/20 flex items-center justify-center text-[#9E8BB9] font-bold text-lg">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xl font-bold text-white">Welcome {firstName}!</p>
          </div>
        </button>
      </header>

      <main className="flex-1 p-6 flex flex-col justify-center gap-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">Scan your bills. Save your food memories!</h2>
          <p className="text-slate-400 font-medium">Remember what you loved, not just where you ate.</p>
        </div>

        <button
          onClick={() => navigate('/scan')}
          className="group relative overflow-hidden bg-gradient-to-br from-[#7C6A96] to-[#5A4B70] text-white rounded-[2rem] p-12 flex flex-col items-center justify-center gap-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all border border-[#8A78A4]/20"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Camera size={64} strokeWidth={1.5} className="relative z-10 drop-shadow-sm" />
          <span className="text-2xl font-extrabold relative z-10">Scan a new Bill</span>
        </button>

        <button
          onClick={() => navigate('/previous')}
          className="group relative overflow-hidden bg-[#22252E] text-[#9E8BB9] border-2 border-[#2D313D] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md hover:bg-[#2D313D] hover:border-[#363A47] hover:-translate-y-0.5 transition-all"
        >
          <Utensils size={32} className="relative z-10" />
          <span className="text-lg font-bold relative z-10">View Food Memories</span>
        </button>
      </main>
    </div>
  );
}
