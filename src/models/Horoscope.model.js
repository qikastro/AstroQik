import mongoose from 'mongoose';

// ── Sub-schemas ───────────────────────────────────────────────────────────────
const planetSchema = new mongoose.Schema({
  planet: String,
  longitudeDegrees: Number,
  rasi: String,
  rasiNumber: Number,
  degrees: Number,
  minutes: Number,
  seconds: Number,
  nakshatra: String,
  nakshatraLord: String,
  pada: Number,
  house: Number,
  isRetrograde: Boolean,
  speed: Number,
  navamsaRasi: String,
  navamsaRasiNumber: Number,
  navamsaDegrees: Number,
  navamsaMinutes: Number,
  navamsaLord: String,
}, { _id: false });

const houseCuspSchema = new mongoose.Schema({
  house: Number,
  longitude: Number,
  rasi: String,
  degrees: Number,
  minutes: Number,
  nakshatra: String,
  nakshatraLord: String,
}, { _id: false });

const bhavaSchema = new mongoose.Schema({
  house: Number,
  occupants: [String],
  lord: String,
  significators: [String],
}, { _id: false });

const dashaSchema = new mongoose.Schema({
  planet: String,
  startDate: Date,
  endDate: Date,
  years: Number,
  antardashas: [{
    planet: String,
    startDate: Date,
    endDate: Date,
    days: Number,
    _id: false,
  }],
}, { _id: false });

const transitSchema = new mongoose.Schema({
  planet: String,
  currentRasi: String,
  birthRasi: String,
  currentDeg: Number,
  effect: String,
}, { _id: false });

// ── Main Horoscope Schema ─────────────────────────────────────────────────────
const horoscopeSchema = new mongoose.Schema({
  nativeName: { type: String, required: true, trim: true },
  birthDate: { type: String, required: true },  // YYYY-MM-DD
  birthTime: { type: String, required: true },  // HH:MM:SS
  birthPlace: {
    areaName: String,
    resolvedDisplayName: String,
    latitude: Number,
    longitude: Number,
    timezoneOffset: Number,
  },
  // Computed Astrological Data
  ascendantDegree: Number,
  ascendantRasi: String,
  ascendantNavamsaRasi: String,
  ascendantNavamsaRasiNumber: Number,
  ascendantNavamsaLord: String,
  ayanamsa: { type: String, default: 'KP' },
  houseSystem: { type: String, default: 'Placidus' },
  planets: [planetSchema],
  houseCusps: [houseCuspSchema],
  bhavas: [bhavaSchema],
  // Vimshottari Dasha
  mahadasha: [dashaSchema],
  currentMahadasha: String,
  currentAntardasha: String,
  // Transits
  transits: [transitSchema],
  // User linkage
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

horoscopeSchema.index({ createdBy: 1, createdAt: -1 });
horoscopeSchema.index({ nativeName: 'text' });

export default mongoose.model('Horoscope', horoscopeSchema);
