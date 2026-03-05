import { useEffect, useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import HomeCard from '../components/homes/HomeCard';
import HomeForm from '../components/homes/HomeForm';
import { apiGet } from '../api/client';
import type { Home } from '../types';

export default function HomeListPage() {
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchHomes = async () => {
    try {
      const data = await apiGet<Home[]>('/homes');
      setHomes(data);
    } catch (err) {
      console.error('Failed to fetch homes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomes();
  }, []);

  const handleSave = () => {
    setShowModal(false);
    fetchHomes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="My Homes"
        action={
          <Button onClick={() => setShowModal(true)}>Add Home</Button>
        }
      />

      {homes.length === 0 ? (
        <EmptyState
          message="You haven't added any homes yet."
          action={
            <Button onClick={() => setShowModal(true)}>Add Your First Home</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {homes.map((home) => (
            <HomeCard key={home.id} home={home} />
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Home"
      >
        <HomeForm onSave={handleSave} onCancel={() => setShowModal(false)} />
      </Modal>
    </div>
  );
}
