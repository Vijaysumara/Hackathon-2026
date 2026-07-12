import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  HelpCircle, 
  PlusCircle, 
  X, 
  CheckCircle,
  AlertTriangle,
  History,
  Trash2
} from "lucide-react";

export default function Bookings({ user }) {
  const [sharedAssets, setSharedAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Booking Form state
  const [showFormModal, setShowFormModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00"
  });

  // Reschedule state
  const [reschedulingBooking, setReschedulingBooking] = useState(null);

  useEffect(() => {
    fetchSharedResources();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      fetchAssetBookings(selectedAsset.id);
    }
  }, [selectedAsset]);

  const fetchSharedResources = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await api.assets.getAssets({ is_shared: true });
      setSharedAssets(list);
      if (list.length > 0) {
        setSelectedAsset(list[0]);
      }
    } catch (e) {
      setError(e.message || "Failed to load shared resources.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetBookings = async (assetId) => {
    setLoading(true);
    try {
      const list = await api.bookings.getBookings(assetId);
      // Sort bookings: upcoming/ongoing first, ordered by start time
      const sorted = list.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      setBookings(sorted);
    } catch (e) {
      setError(e.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const startStr = `${bookingForm.date}T${bookingForm.startTime}:00`;
    const endStr = `${bookingForm.date}T${bookingForm.endTime}:00`;

    const start_dt = new Date(startStr);
    const end_dt = new Date(endStr);

    if (start_dt >= end_dt) {
      setError("Start time must be before the end time.");
      return;
    }

    try {
      if (reschedulingBooking) {
        // Reschedule workflow
        await api.bookings.rescheduleBooking(reschedulingBooking.id, {
          asset_id: selectedAsset.id,
          start_time: start_dt.toISOString(),
          end_time: end_dt.toISOString()
        });
        setSuccess("Booking rescheduled successfully!");
        setReschedulingBooking(null);
      } else {
        // Create new booking
        await api.bookings.createBooking({
          asset_id: selectedAsset.id,
          start_time: start_dt.toISOString(),
          end_time: end_dt.toISOString()
        });
        setSuccess("Resource booked successfully!");
      }
      setShowFormModal(false);
      fetchAssetBookings(selectedAsset.id);
    } catch (err) {
      setError(err.message || "Failed to schedule resource. Check for overlaps.");
    }
  };

  const handleCancelBooking = async (id) => {
    setError("");
    setSuccess("");
    try {
      await api.bookings.cancelBooking(id);
      setSuccess("Booking cancelled successfully.");
      fetchAssetBookings(selectedAsset.id);
    } catch (err) {
      setError(err.message || "Failed to cancel booking.");
    }
  };

  const openReschedule = (booking) => {
    setReschedulingBooking(booking);
    
    // Extract date, start, and end time strings from ISO timestamp
    const startDateObj = new Date(booking.start_time);
    const endDateObj = new Date(booking.end_time);

    const dStr = startDateObj.toISOString().split("T")[0];
    const sStr = startDateObj.toTimeString().split(" ")[0].slice(0, 5);
    const eStr = endDateObj.toTimeString().split(" ")[0].slice(0, 5);

    setBookingForm({
      date: dStr,
      startTime: sStr,
      endTime: eStr
    });
    setShowFormModal(true);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Resource Booking Schedule</h2>
          <p className="text-xs text-slate-500 mt-1">Book shared facilities, vehicles, and assets. The system prevents double bookings.</p>
        </div>

        {selectedAsset && (
          <button
            onClick={() => {
              setReschedulingBooking(null);
              setBookingForm({
                date: new Date().toISOString().split("T")[0],
                startTime: "09:00",
                endTime: "10:00"
              });
              setShowFormModal(true);
            }}
            className="bg-odoo-purple hover:bg-odoo-darkPurple text-white py-2 px-4 rounded-xl font-semibold flex items-center gap-2 text-sm shadow-md shadow-odoo-purple/10 hover:-translate-y-0.5 transition-all"
          >
            <PlusCircle size={16} />
            <span>Book Selected Resource</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 text-sm text-red-700 font-medium">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl flex items-center gap-3 text-sm text-green-700 font-medium">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Shared Resource List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shared Bookable Resources</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {sharedAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedAsset?.id === asset.id
                    ? "bg-odoo-purple text-white border-transparent shadow-lg shadow-odoo-purple/15"
                    : "bg-white text-slate-800 border-slate-100 hover:border-slate-300 shadow-sm"
                }`}
              >
                <h4 className="font-bold text-sm truncate">{asset.name}</h4>
                <div className={`mt-2 flex items-center gap-1 text-xs ${
                  selectedAsset?.id === asset.id ? "text-purple-200" : "text-slate-500"
                }`}>
                  <MapPin size={12} />
                  <span className="truncate">{asset.location}</span>
                </div>
              </button>
            ))}

            {sharedAssets.length === 0 && (
              <div className="p-6 text-center text-slate-450 italic text-xs">
                No shared resources registered.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Schedule View */}
        <div className="lg:col-span-3 space-y-4">
          {selectedAsset ? (
            <>
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-slate-700">
                <div className="text-sm">
                  <span>Selected Schedule for: </span>
                  <span className="font-bold text-slate-900">{selectedAsset.name}</span>
                  <span className="text-xs text-slate-550 ml-2 font-mono">({selectedAsset.asset_tag})</span>
                </div>
                <div className="text-xs flex items-center gap-1 bg-white px-3 py-1 rounded-full font-semibold border border-slate-200">
                  <Clock size={12} />
                  <span>Hours: 8:00 - 18:00</span>
                </div>
              </div>

              {/* Schedule listing */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Time Slots</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {bookings.map((booking) => {
                    const start = new Date(booking.start_time);
                    const end = new Date(booking.end_time);
                    
                    const isOwnBooking = booking.booked_by_id === user.id;

                    return (
                      <div 
                        key={booking.id} 
                        className={`p-5 rounded-2xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow transition-all duration-200 ${
                          booking.status === "Cancelled" ? "opacity-60 bg-slate-50/50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl border shrink-0 ${
                            booking.status === "Completed" ? "bg-slate-50 text-slate-450 border-slate-100" :
                            booking.status === "Ongoing" ? "bg-green-50 text-green-700 border-green-150" :
                            booking.status === "Cancelled" ? "bg-red-50 text-red-500 border-red-100" :
                            "bg-purple-50 text-odoo-purple border-purple-100"
                          }`}>
                            <CalendarDays size={20} />
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-800">
                              {start.toLocaleDateString()}
                            </h4>
                            <p className="text-xs text-slate-550 font-medium flex items-center gap-1.5">
                              <Clock size={12} className="text-slate-400" />
                              <span>
                                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500">
                              Booked by: <span className="font-semibold text-slate-700">{booking.booked_by.name}</span>
                              {isOwnBooking && <span className="ml-2 text-xs bg-purple-50 text-odoo-purple px-2 py-0.5 rounded-full border border-purple-100 font-bold">You</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            booking.status === "Completed" ? "bg-slate-100 text-slate-500" :
                            booking.status === "Ongoing" ? "bg-green-100 text-green-800" :
                            booking.status === "Cancelled" ? "bg-red-100 text-red-700" :
                            "bg-purple-100 text-purple-800"
                          }`}>
                            {booking.status}
                          </span>

                          {booking.status === "Upcoming" && (isOwnBooking || user.role === "Admin" || user.role === "Asset Manager") && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openReschedule(booking)}
                                className="px-3 py-1.5 border border-slate-200 hover:border-odoo-purple hover:text-odoo-purple text-slate-600 rounded-xl text-xs font-bold transition-all bg-white"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                className="p-2 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-650 text-slate-650 rounded-xl transition-all bg-white"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {bookings.length === 0 && (
                    <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 italic text-sm">
                      No active bookings for this resource. Schedule one using the button above.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-450 italic text-sm bg-white rounded-2xl border border-slate-100">
              Please select a shared bookable resource from the panel on the left to view schedules.
            </div>
          )}
        </div>
      </div>

      {/* BOOKING / RESCHEDULE MODAL */}
      {showFormModal && selectedAsset && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-lg font-bold text-slate-800 font-sans">
                {reschedulingBooking ? "Reschedule Booking" : `Book Shared ${selectedAsset.category?.name}`}
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedAsset.name} ({selectedAsset.asset_tag})</p>
            </div>
            
            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Booking Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Start Time</label>
                  <select
                    value={bookingForm.startTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600 font-medium"
                  >
                    <option value="08:00">08:00 AM</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">01:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:00">05:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">End Time</label>
                  <select
                    value={bookingForm.endTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-odoo-purple/20 focus:border-odoo-purple outline-none text-slate-600 font-medium"
                  >
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">01:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:00">05:00 PM</option>
                    <option value="18:00">06:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-odoo-purple hover:bg-odoo-darkPurple text-white text-sm font-semibold shadow-md shadow-odoo-purple/10 transition-all"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
