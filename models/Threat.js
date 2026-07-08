import mongoose from 'mongoose';

const ThreatSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    level: {
        type: Number,
        required: true
    },
    stats: {
        proc_count: Number,
        net_count: Number
    },
    status: {
        memory: Number,
        process: Number,
        modules: Number,
        syscalls: Number,
        hooks: Number,
        files: Number
    },
    blockedCount: {
        type: Number,
        default: 0
    }
});

const Threat = mongoose.model('Threat', ThreatSchema);
export default Threat;