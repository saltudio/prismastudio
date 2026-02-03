
import React, { useEffect, useState } from 'react';
import { listenToAllUsers, updateUserStatus, UserProfile } from '../userGate';
import { Check, X, ShieldAlert, Loader2, Mail, Fingerprint, Calendar } from 'lucide-react';

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenToAllUsers((allUsers) => {
      setUsers(allUsers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brutal-bg dark:bg-brutal-dark">
        <Loader2 className="w-12 h-12 animate-spin text-brutal-yellow" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen animate-fade-in">
      <div className="bg-brutal-dark text-white p-10 border-4 border-brutal-dark shadow-brutal mb-12">
        <h1 className="font-display font-black text-5xl uppercase tracking-tighter flex items-center gap-4 leading-none">
          <ShieldAlert className="w-14 h-14 text-brutal-yellow" /> USER MANAGEMENT
        </h1>
        <p className="font-mono text-white/50 uppercase text-[10px] mt-4 tracking-widest">Master Production Access Control</p>
      </div>

      <div className="grid gap-6">
        {users.map((user) => (
          <div key={user.uid} className="bg-white dark:bg-brutal-dark border-4 border-brutal-dark dark:border-brutal-gray p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-brutal transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]">
            <div className="flex flex-col gap-2 flex-grow">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-brutal-blue" />
                <span className="font-display font-black text-xl text-brutal-dark dark:text-white uppercase break-all">{user.email}</span>
                <span className={`px-2 py-1 text-[9px] font-black uppercase border-2 ${
                  user.status === 'approved' ? 'bg-green-100 text-green-800 border-green-800' :
                  user.status === 'blocked' ? 'bg-red-100 text-red-800 border-red-800' :
                  'bg-yellow-100 text-yellow-800 border-yellow-800'
                }`}>
                  {user.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase text-brutal-dark/40 dark:text-white/40">
                  <Fingerprint className="w-3 h-3" /> ID: {user.uid}
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase text-brutal-dark/40 dark:text-white/40">
                  <Calendar className="w-3 h-3" /> Since: {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'New'}
                </div>
              </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              {user.status !== 'approved' && (
                <button
                  onClick={() => updateUserStatus(user.uid, 'approved')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white border-2 border-brutal-dark font-display font-black uppercase text-xs shadow-brutal-sm hover:bg-green-600"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
              )}
              {user.status !== 'blocked' && (
                <button
                  onClick={() => updateUserStatus(user.uid, 'blocked')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white border-2 border-brutal-dark font-display font-black uppercase text-xs shadow-brutal-sm hover:bg-red-600"
                >
                  <X className="w-4 h-4" /> Block
                </button>
              )}
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="p-24 text-center bg-white dark:bg-brutal-dark border-4 border-brutal-dark shadow-brutal">
            <p className="font-display font-black uppercase text-brutal-dark/20 dark:text-white/10 text-3xl tracking-widest">
              Zero Users Found
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
