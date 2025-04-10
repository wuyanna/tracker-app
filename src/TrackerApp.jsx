import { useState, useEffect, useRef } from "react";
import { parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

const EVENT_COLORS = {
  Sleeping: "bg-purple-500",
  Pumping: "bg-green-500",
  Breastfeeding: "bg-pink-500",
};

const EVENT_UNITS = {
  duration: {
    hours: "hrs",
    minutes: "min",
  },
  volume: {
    ml: "ml",
  },
};

const defaultPrototypes = {
  Sleeping: [
    { name: "start", label: "Start Time", type: "datetime-local" },
    { name: "duration", label: "Duration (hour)", type: "number", unit: EVENT_UNITS.duration.hours }
  ],
  Pumping: [
    { name: "start", label: "Start Time", type: "datetime-local" },
    { name: "volume", label: "Volume (ml)", type: "range", min: 0, max: 200, step: 5, unit: EVENT_UNITS.volume.ml },
    { name: "side", label: "Side", type: "select", options: ["Both", "Left", "Right"] },
    { name: "duration", label: "Duration (min)", type: "number", unit: EVENT_UNITS.duration.minutes }
  ],
  Breastfeeding: [
    { name: "start", label: "Start Time", type: "datetime-local" },
    { name: "side", label: "Side", type: "select", options: ["Both", "Left", "Right"] },
    { name: "duration", label: "Duration (min)", type: "number", unit: EVENT_UNITS.duration.minutes }
  ],
};

const getEventColorClass = (type) => {
  if (EVENT_COLORS[type]) return EVENT_COLORS[type];
  const customColors = JSON.parse(localStorage.getItem("customEventColors") || "{}");
  const hex = customColors[type];
  return hex ? `bg-[${hex}]` : "bg-gray-400";
};

const getCustomEventTypes = () => {
  try {
    const stored = localStorage.getItem("customEventTypes");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

// Utility function to convert duration input to seconds
const convertToSeconds = (duration, unit) => {
  switch (unit) {
    case EVENT_UNITS.duration.hours:
      return duration * 3600; // 1 hour = 3600 seconds
    case EVENT_UNITS.duration.minutes:
      return duration * 60;   // 1 minute = 60 seconds
    default:
      return duration;        // Assume input is already in seconds
  }
};

export default function TrackerApp() {
  const [customEventTypes, setCustomEventTypes] = useState(getCustomEventTypes());
  const [newEventType, setNewEventType] = useState("");
  const [newEventColor, setNewEventColor] = useState("#8884d8");
  const [newEventVolume, setNewEventVolume] = useState(true);
  const [newEventDuration, setNewEventDuration] = useState(true);
  const [customInputs, setCustomInputs] = useState([]);
  const [inputName, setInputName] = useState("");
  const [inputType, setInputType] = useState("number");
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [lastVolume, setLastVolume] = useState(50);
  const [volume, setVolume] = useState(50);
  const [side, setSide] = useState("Both");
  const [startTime, setStartTime] = useState(new Date());
  const [duration, setDuration] = useState(0);
  const todayRef = useRef(null);

  // Initialize the input fields
  const startEvent = (type) => {
    if (currentEvent) return;
    const now = new Date();
    setCurrentEvent({ type });
    setStartTime(now);
    setDuration(duration);
    setVolume(lastVolume);
    setSide("Both");
  };

  const endEvent = () => {
    if (!currentEvent) return;
    const start = new Date(startTime);
    const calculatedDuration = duration || Math.round((new Date() - start) / 1000);

    const finishedEvent = {
      ...currentEvent, // only type is present
      start,
      duration: calculatedDuration,
      volume: getEventPrototype(currentEvent.type).some(input => input.name === "volume") ? volume : null,
      side: getEventPrototype(currentEvent.type).some(input => input.name === "side") ? side : null,
    };

    const updatedEvents = [...events];
    if (editIndex !== null) {
      updatedEvents[editIndex] = finishedEvent;
    } else {
      updatedEvents.push(finishedEvent);
    }

    setEvents(updatedEvents);
    setCurrentEvent(null);
    setEditIndex(null);
    setLastVolume(volume);

    fetch("https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec", {
      method: "POST",
      body: JSON.stringify(finishedEvent),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  const handleEdit = (event, index) => {
    setCurrentEvent({ type: event.type });
    setStartTime(new Date(event.start));
    setDuration(event.duration || 0);
    setVolume(event.volume ?? lastVolume);
    setSide(event.side ?? "Both");
    setEditIndex(index);
  };

  const handleDelete = (index) => {
    const updated = [...events];
    updated.splice(index, 1);
    setEvents(updated);
  };

  const groupedEvents = events
    .slice()
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .reduce((acc, event, idx) => {
      const dateKey = format(new Date(event.start), "yyyy-MM-dd");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push({ ...event, idx });
      return acc;
    }, {});

  useEffect(() => {
    fetch("https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec")
      .then((res) => res.json())
      .then((data) => {
        const parsed = data.map((e) => ({
          ...e,
          start: new Date(e.start),
          duration: Number(e.duration),
          volume: e.volume ? Number(e.volume) : null,
        }));
        setEvents(parsed);
      });

    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const getDailySummary = (events) => {
    const summary = {
      sleepingDuration: 0,
      pumpingCount: 0,
      pumpingVolume: 0,
      breastfeedingCount: 0,
      breastfeedingDuration: 0,
      progress: 0,
    };
    for (let e of events) {
      if (e.type === "Sleeping") summary.sleepingDuration += e.duration;
      if (e.type === "Pumping") {
        summary.pumpingCount++;
        summary.pumpingVolume += e.volume || 0;
      }
      if (e.type === "Breastfeeding") {
        summary.breastfeedingCount++;
        summary.breastfeedingDuration += e.duration;
      }
    }
    return summary;
  };

  const getEventPrototype = (type) => {
    const customSettings = JSON.parse(localStorage.getItem("customEventSettings") || "{}");
    const base = defaultPrototypes[type] || [];
    const custom = customSettings[type];
    if (!custom) return base;

    const out = [];
  
    if (custom.customInputs && Array.isArray(custom.customInputs)) {
      for (let input of custom.customInputs) {
        if (input.type === "range") {
          out.push({ name: input.name, label: input.name, type: "range", min: 0, max: 100, step: 5 });
        } else if (input.type === "select") {
          out.push({ name: input.name, label: input.name, type: "select", options: ["Option 1", "Option 2"] });
        } else {
          out.push({ name: input.name, label: input.name, type: input.type });
        }
      }
    }
    if (custom.duration) out.push({ name: "duration", label: "Duration (min)", type: "number" });
    if (custom.volume) {
      out.push({ name: "volume", label: "Volume (ml)", type: "range", min: 0, max: 200, step: 10 });
      out.push({ name: "side", label: "Side", type: "select", options: ["Both", "Left", "Right"] });
    }
    return out;
  };

  /**
   * Finds the unit for a specific input field based on event type and input name
   * @param {string} eventType - The type of the event (e.g., "Sleeping", "Pumping")
   * @param {string} inputName - The name of the input field (e.g., "duration", "volume")
   * @returns {string} The unit string or empty string if not found
   */
  const getInputUnit = (eventType, inputName) => {
    const prototype = getEventPrototype(eventType);
    const inputField = prototype.find(input => input.name === inputName);
    return inputField && inputField.unit ? inputField.unit : '';
  };

  // Function to convert seconds to a display format
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours} hr${hours > 1 ? 's' : ''} ${minutes % 60} min`;
    }
    return `${minutes} min`;
  };

  const handleDurationChange = (e) => {
    const inputDuration = parseInt(e.target.value, 10);
    const unit = getInputUnit(currentEvent.type, "duration");
    const durationInSeconds = convertToSeconds(inputDuration, unit);
    setDuration(durationInSeconds);
  };

  const getDurationInUnit = (duration, unit) => {
    switch (unit) {
      case EVENT_UNITS.duration.hours:
        return duration / 3600;
      case EVENT_UNITS.duration.minutes:
        return duration / 60;
      default:
        return duration;
    }
  };

  const renderTrackerTab = () => (
    <TabsContent value="track">
      <h1 className="text-xl font-bold mb-4">Breastfeeding Tracker</h1>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Object.keys(defaultPrototypes).map((type) => (
          <Button key={type} onClick={() => startEvent(type)} disabled={!!currentEvent}>{type}</Button>
        ))}
      </div>
      {currentEvent && (
        <div className="mb-4">
          <Card className="shadow-md">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">
                  {editIndex !== null ? `Editing: ${currentEvent.type}` : `Recording: ${currentEvent.type}`}
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setCurrentEvent(null); setEditIndex(null); }}>✖ Cancel</Button>
              </div>
              {getEventPrototype(currentEvent.type).map((input) => (
                <div key={input.name}>
                  {input.type === "datetime-local" && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{input.label}</label>
                      <input
                        type="datetime-local"
                        value={startTime.toISOString().slice(0, 16)}
                        onChange={(e) => setStartTime(new Date(e.target.value))}
                        className="border rounded px-2 py-1 w-full text-xs"
                      />
                    </div>
                  )}
                  {input.type === "number" && input.name === "duration" && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{input.label}</label>
                      <input
                        type="number"
                        min="0"
                        value={getDurationInUnit(duration, getInputUnit(currentEvent.type, "duration"))}
                        onChange={handleDurationChange}
                        className="border rounded px-2 py-1 w-full text-xs"
                        placeholder={input.label}
                      />
                    </div>
                  )}
                  {input.type === "number" && input.name === "volume" && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{input.label}</label>
                      <input
                        type="number"
                        min="0"
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                        className="border rounded px-2 py-1 w-full text-xs"
                        placeholder={input.label}
                      />
                    </div>
                  )}
                  
                  {input.type === "range" && (
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-gray-600">{input.label}</label>
                        <span className="text-xs font-medium">{volume} {getInputUnit(currentEvent.type, "volume")}</span>
                      </div>
                      <input
                        type="range"
                        min={input.min}
                        max={input.max}
                        step={input.step}
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                        className="w-full"
                      />
                    </div>
                  )}
                  {input.type === "select" && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{input.label}</label>
                      <select
                        value={side}
                        onChange={(e) => setSide(e.target.value)}
                        className="border rounded px-2 py-1 w-full text-xs">
                        {input.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
              <Button className="mt-2 w-full" onClick={endEvent}>{editIndex !== null ? "Update" : "Save"}</Button>
            </CardContent>
          </Card>
        </div>
      )}
      <h2 className="text-lg font-semibold mb-2 mt-6">Timeline</h2>
      <div className="space-y-6 border-l border-gray-300 pl-6">
        {Object.entries(groupedEvents).map(([date, dailyEvents]) => {
          const summary = getDailySummary(dailyEvents);
          
          return (
            <div key={date} ref={date === format(new Date(), "yyyy-MM-dd") ? todayRef : null}>
              <div className="text-sm text-gray-700 font-semibold mb-1">{format(parseISO(date), "PPP")}</div>
              <div className="text-xs text-gray-500 mb-2">
               Sleep: {getDurationInUnit(summary.sleepingDuration, EVENT_UNITS.duration.hours)} hrs • Pumping: {summary.pumpingCount}x, {summary.pumpingVolume}ml • Breastfeeding: {summary.breastfeedingCount}x, {getDurationInUnit(summary.breastfeedingDuration, EVENT_UNITS.duration.minutes)} min
              </div>
              
              <div className="space-y-4 mt-3">
                {dailyEvents.map((e) => (
                  <div key={e.idx} className="relative flex items-start gap-2">
                    <div className={`absolute -left-3 top-2 h-2 w-2 rounded-full mt-1.5 ${getEventColorClass(e.type)}`} />
                    <div className="w-16 text-xs text-right text-gray-500">{format(new Date(e.start), "HH:mm")}</div>
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{e.type}</div>
                      <div className="text-xs text-gray-500">
                        {formatDuration(e.duration)}
                        {e.volume != null && ` • ${e.volume} ${getInputUnit(e.type, "volume")}`} {e.side && ` • ${e.side}`}
                      </div>
                    </div>
                    <div className="space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(e, e.idx)}>✏️</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(e.idx)}>🗑️</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </TabsContent>
  );

  const renderAnalysisTab = () => (
    <TabsContent value="analysis">
      <h2 className="text-lg font-semibold mb-2">Daily Trends</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-purple-600 mb-1">Sleep (hours)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={Object.entries(groupedEvents).map(([date, dailyEvents]) => {
                const summary = getDailySummary(dailyEvents);
                return {
                  date: format(parseISO(date), "MM/dd"),
                  value: getDurationInUnit(summary.sleepingDuration, EVENT_UNITS.duration.hours),
                };
              })}
            >
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#a78bfa" name="Sleep (hr)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h3 className="text-sm font-medium text-green-600 mb-1">Pumping Volume (ml)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={Object.entries(groupedEvents).map(([date, dailyEvents]) => {
                const summary = getDailySummary(dailyEvents);
                return {
                  date: format(parseISO(date), "MM/dd"),
                  value: summary.pumpingVolume,
                };
              })}
            >
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#34d399" name="Pumping (ml)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h3 className="text-sm font-medium text-pink-600 mb-1">Breastfeeding (minutes)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={Object.entries(groupedEvents).map(([date, dailyEvents]) => {
                const summary = getDailySummary(dailyEvents);
                return {
                  date: format(parseISO(date), "MM/dd"),
                  value: getDurationInUnit(summary.breastfeedingDuration, EVENT_UNITS.duration.minutes),
                };
              })}
            >
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#f472b6" name="Breastfeeding (min)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </TabsContent>
  );

  const renderSettingsTab = () => (
    <TabsContent value="settings">
      <h2 className="text-lg font-semibold mb-2">Settings</h2>
      <div className="space-y-2">
        <input
          type="text"
          value={newEventType}
          onChange={(e) => setNewEventType(e.target.value)}
          placeholder="New event type"
          className="border px-2 py-1 rounded w-full text-sm"
        />
        <input
          type="color"
          value={newEventColor}
          onChange={(e) => setNewEventColor(e.target.value)}
          className="w-full h-8 rounded border"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={newEventVolume} onChange={(e) => setNewEventVolume(e.target.checked)} />
          Track volume
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={newEventDuration} onChange={(e) => setNewEventDuration(e.target.checked)} />
          Track duration
        </label>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Input name"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              className="border px-2 py-1 rounded text-sm w-1/2"
            />
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value)}
              className="border px-2 py-1 rounded text-sm w-1/2"
            >
              <option value="number">Number</option>
              <option value="range">Slider</option>
              <option value="select">Dropdown</option>
            </select>
            <Button
              size="sm"
              onClick={() => {
                if (!inputName.trim()) return;
                setCustomInputs([...customInputs, { name: inputName.trim(), type: inputType }]);
                setInputName("");
                setInputType("number");
              }}
            >Add Field</Button>
          </div>
          <ul className="text-xs text-gray-600 list-disc list-inside">
            {customInputs.map((input, i) => (
              <li key={i}>{input.name} ({input.type})</li>
            ))}
          </ul>
        </div>

        <Button onClick={() => {
          const name = newEventType.trim();
          if (!name || Object.keys(defaultPrototypes).includes(name) || customEventTypes.includes(name)) return;
          const settingsMap = JSON.parse(localStorage.getItem("customEventSettings") || "{}");
          settingsMap[name] = { volume: newEventVolume, duration: newEventDuration, customInputs };
          localStorage.setItem("customEventSettings", JSON.stringify(settingsMap));
          const updated = [...customEventTypes, name];
          const colorMap = JSON.parse(localStorage.getItem("customEventColors") || "{}");
          colorMap[name] = newEventColor;
          localStorage.setItem("customEventColors", JSON.stringify(colorMap));
          setCustomEventTypes(updated);
          localStorage.setItem("customEventTypes", JSON.stringify(updated));
          setNewEventType("");
          setCustomInputs([]);
            setNewEventType("");
          }}
        >
          Add
        </Button>
        <ul className="text-sm list-disc list-inside">
          {customEventTypes.map((type) => (
            <li key={type} className="flex justify-between items-center">
              <span>{type}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const filtered = customEventTypes.filter((t) => t !== type);
                  setCustomEventTypes(filtered);
                  localStorage.setItem("customEventTypes", JSON.stringify(filtered));
                  const colorMap = JSON.parse(localStorage.getItem("customEventColors") || "{}");
                  delete colorMap[type];
                  const settingsMap = JSON.parse(localStorage.getItem("customEventSettings") || "{}");
                  delete settingsMap[type];
                  localStorage.setItem("customEventSettings", JSON.stringify(settingsMap));
                  localStorage.setItem("customEventColors", JSON.stringify(colorMap));
                }}
              >Remove</Button>
            </li>
          ))}
        </ul>
      </div>
    </TabsContent>
  );

  return (
    <Tabs defaultValue="track" className="p-4 max-w-md mx-auto">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="track">Tracker</TabsTrigger>
        <TabsTrigger value="analysis">Analysis</TabsTrigger>
      <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      {renderTrackerTab()}
      {renderAnalysisTab()}
      {renderSettingsTab()}
    </Tabs>
  );
}
