import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Star, Calendar, Loader2, ChevronDown, ChevronUp, Edit2, Trash2, Save, X } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface BillItem {
  name: string;
  rating: number;
  comment: string;
}

interface Bill {
  id: string;
  restaurantName: string;
  timestamp: Date;
  items: BillItem[];
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function PreviousBills({ user }: { user: User }) {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Bill | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const q = query(
          collection(db, 'bills'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedBills: Bill[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedBills.push({
            id: doc.id,
            restaurantName: data.restaurantName,
            timestamp: data.timestamp?.toDate() || new Date(),
            items: data.items || [],
          });
        });
        
        // Sort on client to avoid requiring a composite index
        fetchedBills.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        setBills(fetchedBills);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'bills');
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [user.uid]);

  const toggleExpand = (billId: string) => {
    setExpandedBills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(billId)) {
        newSet.delete(billId);
      } else {
        newSet.add(billId);
      }
      return newSet;
    });
  };

  const startEdit = (bill: Bill) => {
    setEditingBillId(bill.id);
    // Deep copy to avoid mutating state directly
    setEditFormData(JSON.parse(JSON.stringify(bill)));
    // Ensure it's expanded when editing
    setExpandedBills(prev => new Set(prev).add(bill.id));
  };

  const cancelEdit = () => {
    setEditingBillId(null);
    setEditFormData(null);
  };

  const updateEditItem = (index: number, field: keyof BillItem, value: any) => {
    if (!editFormData) return;
    const newItems = [...editFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditFormData({ ...editFormData, items: newItems });
  };

  const removeEditItem = (index: number) => {
    if (!editFormData) return;
    const newItems = editFormData.items.filter((_, i) => i !== index);
    setEditFormData({ ...editFormData, items: newItems });
  };

  const saveEdit = async () => {
    if (!editFormData || !editFormData.restaurantName.trim() || editFormData.items.length === 0) {
      alert('Restaurant name and at least one item are required.');
      return;
    }

    setSaving(true);
    try {
      const billRef = doc(db, 'bills', editFormData.id);
      await updateDoc(billRef, {
        restaurantName: editFormData.restaurantName,
        items: editFormData.items,
      });

      // Update local state
      setBills(bills.map(b => b.id === editFormData.id ? editFormData : b));
      setEditingBillId(null);
      setEditFormData(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bills/${editFormData.id}`);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const filteredBills = bills.filter((bill) => {
    const query = searchQuery.toLowerCase();
    const matchesRestaurant = bill.restaurantName.toLowerCase().includes(query);
    const matchesItems = bill.items.some((item) => item.name.toLowerCase().includes(query));
    return matchesRestaurant || matchesItems;
  });

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-[#1A1C23] flex flex-col">
      <header className="bg-[#22252E] p-4 shadow-sm flex flex-col gap-4 sticky top-0 z-10 border-b border-[#2D313D]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-[#2D313D]">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Craving History</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search restaurants or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#1A1C23] border-transparent rounded-xl focus:bg-[#22252E] focus:border-[#7C6A96] focus:ring-2 focus:ring-[#7C6A96] focus:outline-none transition-all text-white font-bold placeholder-slate-500"
          />
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={32} className="animate-spin text-[#7C6A96]" />
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg font-bold">No bills found.</p>
            {searchQuery && <p className="text-sm mt-1 font-bold">Try a different search term.</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredBills.map((bill) => {
              const isExpanded = expandedBills.has(bill.id);
              const isEditing = editingBillId === bill.id;

              if (isEditing && editFormData) {
                return (
                  <div key={bill.id} className="bg-[#22252E] rounded-2xl shadow-sm border border-[#7C6A96] overflow-hidden">
                    <div className="p-4 border-b border-[#2D313D] bg-[#22252E]/50 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-[#9E8BB9]">Editing Bill</span>
                        <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-white bg-[#2D313D] rounded-full">
                          <X size={16} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editFormData.restaurantName}
                        onChange={(e) => setEditFormData({...editFormData, restaurantName: e.target.value})}
                        className="w-full text-2xl font-bold text-white border-b-2 border-[#2D313D] focus:border-[#7C6A96] focus:outline-none bg-transparent py-1"
                        placeholder="Restaurant Name"
                      />
                    </div>
                    
                    <div className="p-4 flex flex-col gap-4">
                      {editFormData.items.map((item, idx) => (
                        <div key={idx} className="bg-[#1A1C23] p-4 rounded-xl border border-[#2D313D] flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateEditItem(idx, 'name', e.target.value)}
                              className="flex-1 font-bold text-white border-b border-[#2D313D] focus:border-[#7C6A96] focus:outline-none bg-transparent"
                              placeholder="Item name"
                            />
                            <button onClick={() => removeEditItem(idx)} className="text-slate-500 hover:text-red-400 p-1">
                              <Trash2 size={18} />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => updateEditItem(idx, 'rating', star)}
                                className="p-1 focus:outline-none"
                              >
                                <Star
                                  size={24}
                                  className={star <= item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}
                                />
                              </button>
                            ))}
                          </div>

                          <textarea
                            value={item.comment}
                            onChange={(e) => updateEditItem(idx, 'comment', e.target.value)}
                            placeholder="Add a comment (optional)..."
                            className="w-full text-sm font-bold text-white bg-[#22252E] rounded-xl p-3 border border-[#2D313D] focus:border-[#7C6A96] focus:ring-1 focus:ring-[#7C6A96] focus:outline-none resize-none h-20 placeholder-slate-500"
                          />
                        </div>
                      ))}

                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="w-full bg-[#7C6A96] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#8A78A4] disabled:opacity-70 shadow-md mt-2"
                      >
                        {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={bill.id} className="bg-[#22252E] rounded-2xl shadow-sm border border-[#2D313D] overflow-hidden">
                  <div className="p-4 border-b border-[#2D313D] bg-[#22252E]/50 flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="font-bold text-2xl text-white">{bill.restaurantName}</h2>
                      <div className="flex items-center gap-1 text-sm text-slate-400 mt-1 font-bold">
                        <Calendar size={14} />
                        {bill.timestamp.toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button 
                        onClick={() => startEdit(bill)} 
                        className="p-2 text-slate-400 hover:text-[#9E8BB9] transition-colors rounded-lg hover:bg-[#2D313D]"
                        title="Edit Bill"
                      >
                        <Edit2 size={20} />
                      </button>
                    </div>
                  </div>
                  
                  {!isExpanded && (
                    <button 
                      onClick={() => toggleExpand(bill.id)}
                      className="w-full p-3 bg-[#22252E]/30 hover:bg-[#2D313D]/50 transition-colors flex justify-center items-center gap-2 text-[#9E8BB9] font-bold text-sm"
                    >
                      View Items ({bill.items.length}) <ChevronDown size={16} />
                    </button>
                  )}

                  {isExpanded && (
                    <>
                      <div className="p-4 flex flex-col gap-4">
                        {bill.items
                          .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || bill.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((item, idx) => (
                            <div key={idx} className="flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-white text-lg">{item.name}</span>
                                <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg">
                                  <span className="text-sm font-bold text-yellow-500">{item.rating > 0 ? item.rating : '-'}</span>
                                  <Star size={14} className="fill-yellow-500 text-yellow-500" />
                                </div>
                              </div>
                              {item.comment && (
                                <p className="text-sm text-slate-300 bg-[#1A1C23] p-3 rounded-xl italic font-bold">
                                  "{item.comment}"
                                </p>
                              )}
                              {idx < bill.items.length - 1 && <hr className="border-[#2D313D] mt-2" />}
                            </div>
                          ))}
                      </div>
                      <button 
                        onClick={() => toggleExpand(bill.id)}
                        className="w-full p-3 border-t border-[#2D313D] bg-[#22252E]/30 hover:bg-[#2D313D]/50 transition-colors flex justify-center items-center gap-2 text-slate-400 font-bold text-sm"
                      >
                        Hide Items <ChevronUp size={16} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
