import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import toast from 'react-hot-toast';

interface Squad {
  id: string;
  name: string;
  memberIds?: string[];
}

interface SquadSelectorProps {
  selectedSquadIds: string[];
  onSelectionChange: (squadIds: string[]) => void;
}

export default function SquadSelector({ selectedSquadIds, onSelectionChange }: SquadSelectorProps) {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSquads();
  }, []);

  const fetchSquads = async () => {
    try {
      setLoading(true);
      const squadsQuery = query(
        collection(db, 'squads'),
        orderBy('createdAt', 'desc')
      );
      const squadsSnapshot = await getDocs(squadsQuery);
      const squadsData = squadsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Squad[];
      setSquads(squadsData);
    } catch (error) {
      console.error('Error fetching squads:', error);
      toast.error('Failed to load squads');
    } finally {
      setLoading(false);
    }
  };

  const toggleSquad = (squadId: string) => {
    const newSelection = selectedSquadIds.includes(squadId)
      ? selectedSquadIds.filter((id) => id !== squadId)
      : [...selectedSquadIds, squadId];
    onSelectionChange(newSelection);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading squads...</div>;
  }

  if (squads.length === 0) {
    return (
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">No squads available. Creators need to create squads first.</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <label className="block text-sm font-medium mb-2">Select Squads</label>
      <p className="text-xs text-gray-500 mb-3">Choose which squads can see this gig</p>
      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
        {squads.map((squad) => (
          <label
            key={squad.id}
            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedSquadIds.includes(squad.id)}
              onChange={() => toggleSquad(squad.id)}
              className="rounded"
            />
            <span className="text-sm">{squad.name}</span>
            <span className="text-xs text-gray-500">
              ({squad.memberIds?.length || 0} members)
            </span>
          </label>
        ))}
      </div>
      {selectedSquadIds.length > 0 && (
        <p className="text-xs text-gray-600 mt-2">
          {selectedSquadIds.length} squad{selectedSquadIds.length > 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
