'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../../lib/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProjectsNavigation from '../../../components/ProjectsNavigation';
import PricedItemModal, { PricedItemData } from '../../../components/PricedItemModal';

export default function PricedItemsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [pricedItems, setPricedItems] = useState<PricedItemData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PricedItemData | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.uid);
        await fetchPricedItems(user.uid);
      } else {
        router.push('/admin');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchPricedItems = async (uid: string) => {
    setLoadingItems(true);
    try {
      const itemsRef = collection(db, 'USERS', uid, 'pricedItems');
      const q = query(itemsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const items: PricedItemData[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as PricedItemData));
      
      setPricedItems(items);
    } catch (error) {
      console.error('Error fetching priced items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSaveItem = async (itemData: PricedItemData) => {
    try {
      const itemsRef = collection(db, 'USERS', userId, 'pricedItems');
      
      if (itemData.id) {
        // Update existing item
        const itemDoc = doc(db, 'USERS', userId, 'pricedItems', itemData.id);
        await updateDoc(itemDoc, {
          title: itemData.title,
          description: itemData.description,
          price: itemData.price,
          timeEstimate: itemData.timeEstimate,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Create new item
        await addDoc(itemsRef, {
          title: itemData.title,
          description: itemData.description,
          price: itemData.price,
          timeEstimate: itemData.timeEstimate,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      
      // Refresh the list
      await fetchPricedItems(userId);
      setShowModal(false);
      setEditItem(null);
    } catch (error) {
      console.error('Error saving priced item:', error);
      throw error;
    }
  };

  const handleAddNew = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: PricedItemData) => {
    setEditItem(item);
    setShowModal(true);
  };

  // Filter priced items based on search term
  const filteredItems = pricedItems.filter((item) => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.price.toString().includes(search) ||
      item.timeEstimate.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <Link 
            href="/admin"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Projects</h1>
          <p className="text-gray-600">Manage your projects and priced items</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ProjectsNavigation />
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Priced Items</h2>
                <button 
                  onClick={handleAddNew}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Add New Item
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600">
                  Create and manage reusable priced items that can be added to projects. Set up your catalog of services, products, and materials.
                </p>

                {/* Search Bar */}
                {pricedItems.length > 0 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search items by title, description, price, or time..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg 
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Priced Items List */}
                <div className="mt-6 border-t pt-6">
                  {loadingItems ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : pricedItems.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No priced items yet. Add your first item to build your catalog.
                    </p>
                  ) : filteredItems.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No items match your search. Try different keywords.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                              {item.description && (
                                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                              )}
                              <div className="flex gap-4 text-sm">
                                <span className="font-medium text-green-600">£{item.price.toFixed(2)}</span>
                                {item.timeEstimate && (
                                  <span className="text-gray-500">
                                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {item.timeEstimate}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleEdit(item)}
                              className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                              title="Edit item"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <PricedItemModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditItem(null);
        }}
        onSave={handleSaveItem}
        editItem={editItem}
      />
    </div>
  );
}
