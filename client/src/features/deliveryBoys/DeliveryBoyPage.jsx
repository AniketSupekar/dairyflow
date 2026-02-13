import { useEffect, useState } from "react";
import { getLanes } from "../../api/lane.api";
import {
    getDeliveryBoys,
    deleteDeliveryBoy,
} from "../../api/deliveryBoy.api";
import DeliveryBoyForm from "./DeliveryBoyForm";

const DeliveryBoyPage = () => {
    const [lanes, setLanes] = useState([]);
    const [deliveryBoys, setDeliveryBoys] = useState([]);
    const [editing, setEditing] = useState(null);
    const [refresh, setRefresh] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchDeliveryBoys();
    }, [refresh]);

    const fetchInitialData = async () => {
        const laneRes = await getLanes();
        setLanes(laneRes.data.data);
    };

    const fetchDeliveryBoys = async () => {
        const res = await getDeliveryBoys();
        setDeliveryBoys(res.data.data);
    };

    const handleDelete = async (id) => {
        await deleteDeliveryBoy(id);
        setRefresh(!refresh);
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">
                Delivery Boys
            </h1>

            <DeliveryBoyForm
                lanes={lanes}
                editing={editing}
                setEditing={setEditing}
                refresh={refresh}
                setRefresh={setRefresh}
            />

            <table className="w-full mt-6 border">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-2">Name</th>
                        <th className="border p-2">Phone</th>
                        <th className="border p-2">Assigned Lanes</th>
                        <th className="border p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {deliveryBoys.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="text-center p-4">
                                No delivery boys found.
                            </td>
                        </tr>
                    ) : (
                        deliveryBoys.map((boy) => (
                            <tr key={boy._id}>
                                <td className="border p-2">{boy.name}</td>
                                <td className="border p-2">{boy.phone}</td>
                                <td className="border p-2">
                                    {boy.assignedLanes?.map((lane) => (
                                        <div key={lane._id}>{lane.name}</div>
                                    ))}
                                </td>
                                <td className="border p-2 space-x-2">
                                    <button
                                        onClick={() => setEditing(boy)}
                                        className="bg-blue-500 text-white px-2 py-1"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(boy._id)}
                                        className="bg-red-500 text-white px-2 py-1"
                                    >
                                        Deactivate
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>

            </table>
        </div>
    );
};

export default DeliveryBoyPage;