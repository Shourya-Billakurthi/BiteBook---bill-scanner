import React, { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ChevronLeft, Loader2, Star, Save, Trash2, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '../firebase';

interface MenuItem {
  name: string;
  price?: number;
  rating: number;
  comment: string;
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

export default function ScanBill({ user }: { user: User }) {
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      processImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Image: string) => {
    setLoading(true);
    setError('');
    try {
      const extractBill = httpsCallable(functions, 'extractBill');
      
      const base64Data = base64Image.split(',')[1];
      let mimeType = base64Image.split(';')[0].split(':')[1];

      // Fallback for unsupported mime types
      if (!mimeType || mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
        mimeType = 'image/jpeg';
      }

      const response = await extractBill({
        image: base64Data,
        mimeType: mimeType
      });

      if (response.data) {
        const data = response.data as { restaurantName: string, items: any[] };
        let extractedName = data.restaurantName?.trim() || '';
        const extractedItems = data.items || [];

        if (extractedName.toLowerCase().includes('none found') || extractedName.toLowerCase().includes('unknown')) {
          extractedName = '';
        }

        if (!extractedName && extractedItems.length === 0) {
          setError("We couldn't detect a clear restaurant name or menu items. Please ensure the image is a clear photo of a receipt.");
          setRestaurantName('');
          setItems([]);
        } else {
          setRestaurantName(extractedName);
          setItems(
            extractedItems.map((item: any) => ({
              name: item.name,
              price: item.price,
              rating: 0,
              comment: '',
            }))
          );
        }
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Failed to process the receipt. Please try again.');
      setRestaurantName('');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurantName.trim() || items.length === 0) {
      setError('Restaurant name and at least one item are required.');
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'bills'), {
        userId: user.uid,
        restaurantName,
        timestamp: serverTimestamp(),
        items: items.map((item) => ({
          name: item.name,
          rating: item.rating,
          comment: item.comment,
        })),
      });
      setIsSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'bills');
      setError('Failed to save the bill.');
      setIsSaving(false);
    }
  };

  const updateItem = (index: number, field: keyof MenuItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#1A1C23] flex flex-col items-center justify-center p-4">
        <div className="bg-[#22252E] p-8 rounded-3xl shadow-xl max-w-sm w-full text-center flex flex-col items-center gap-6 border border-[#2D313D]">
          <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center">
            <Save size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white">Saved to your food memories!</h2>
          <p className="text-slate-400 font-bold">You can revisit this meal and your review anytime.</p>
          <div className="flex flex-col gap-3 w-full mt-4">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-[#7C6A96] text-white font-bold py-4 rounded-2xl hover:bg-[#8A78A4] transition-colors"
            >
              Back to Home
            </button>
            <button
              onClick={() => navigate('/previous')}
              className="w-full bg-[#2D313D] text-[#9E8BB9] font-bold py-4 rounded-2xl hover:bg-[#363A47] transition-colors"
            >
              View Food Memories
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#1A1C23] flex flex-col">
      <header className="bg-[#22252E] p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10 border-b border-[#2D313D]">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-[#2D313D]">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Scan Bill</h1>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6">
        {!image ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-[#7C6A96] rounded-3xl flex flex-col items-center justify-center gap-3 text-[#7C6A96] hover:bg-[#7C6A96]/10 transition-colors p-2 text-center"
              >
                <Camera size={40} />
                <span className="font-bold text-sm sm:text-base">Take a Photo</span>
              </button>
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="aspect-square bg-[#22252E] border-2 border-[#2D313D] rounded-3xl flex flex-col items-center justify-center gap-3 text-[#9E8BB9] font-bold hover:bg-[#2D313D] transition-colors shadow-sm p-2 text-center"
              >
                <Upload size={40} />
                <span className="font-bold text-sm sm:text-base">Upload from Gallery</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <Loader2 size={48} className="animate-spin text-[#7C6A96] mb-4" />
                <p className="text-xl font-bold text-white animate-pulse">Scanning your bill....</p>
                <p className="text-lg font-bold text-[#9E8BB9] animate-pulse">Extracting details</p>
                <p className="text-sm font-serif italic text-slate-400 mt-2 animate-pulse">This usually takes a few seconds</p>
              </div>
            ) : error && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-6 text-center bg-[#22252E] rounded-3xl border border-[#2D313D] p-6 shadow-lg">
                <div className="w-20 h-20 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-2">
                  <AlertCircle size={40} />
                </div>
                <h2 className="text-xl font-bold text-white">Scan Failed</h2>
                <p className="text-slate-400 font-medium leading-relaxed">
                  {error}
                </p>
                <div className="flex flex-col gap-3 w-full mt-4">
                  <button
                    onClick={() => {
                      setImage(null);
                      setError('');
                      setRestaurantName('');
                      setItems([]);
                    }}
                    className="w-full bg-[#2D313D] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#363A47] transition-colors shadow-md border border-[#7C6A96]/30"
                  >
                    <RefreshCw size={20} />
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      setError('');
                      setRestaurantName('');
                      setItems([{ name: '', rating: 0, comment: '' }]);
                    }}
                    className="w-full bg-transparent text-[#9E8BB9] py-3 rounded-2xl font-bold text-base flex items-center justify-center hover:bg-[#2D313D] transition-colors"
                  >
                    Enter details manually
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-[#22252E] p-4 rounded-2xl shadow-sm border border-[#2D313D]">
                  <label className="block text-sm font-bold text-slate-400 mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full text-xl font-bold text-white border-b-2 border-transparent focus:border-[#7C6A96] focus:outline-none bg-transparent py-1"
                    placeholder="Enter restaurant name"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-bold text-white px-1">Menu Items</h2>
                  {items.map((item, index) => (
                    <div key={index} className="bg-[#22252E] p-4 rounded-2xl shadow-sm border border-[#2D313D] flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                          className="flex-1 font-bold text-white border-b border-transparent focus:border-[#7C6A96] focus:outline-none bg-transparent"
                          placeholder="Item name"
                        />
                        <button onClick={() => removeItem(index)} className="text-slate-500 hover:text-red-400 p-1">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-400">How did you like it?</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => updateItem(index, 'rating', star)}
                              className="p-1 focus:outline-none"
                            >
                              <Star
                                size={24}
                                className={star <= item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        value={item.comment}
                        onChange={(e) => updateItem(index, 'comment', e.target.value)}
                        placeholder="What did you like or dislike? (optional)"
                        className="w-full text-sm font-bold text-white bg-[#1A1C23] rounded-xl p-3 border border-[#2D313D] focus:border-[#7C6A96] focus:ring-1 focus:ring-[#7C6A96] focus:outline-none resize-none h-20 placeholder-slate-500"
                      />
                    </div>
                  ))}

                  <button
                    onClick={() => setItems([...items, { name: '', rating: 0, comment: '' }])}
                    className="w-full bg-[#2D313D] text-[#9E8BB9] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#363A47] transition-colors border border-dashed border-[#7C6A96] mt-2"
                  >
                    <Plus size={20} />
                    Add Another Item
                  </button>
                </div>

                {error && <div className="text-red-400 text-sm font-bold text-center bg-red-500/10 p-3 rounded-xl">{error}</div>}

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-[#7C6A96] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#8A78A4] disabled:opacity-70 shadow-md mt-4"
                >
                  {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                  {isSaving ? 'Saving...' : 'Save Review'}
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
