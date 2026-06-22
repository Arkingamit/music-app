"use strict";
/**
 * Seed Script for Grace Music App
 *
 * Populates the MongoDB database with initial data:
 * - Admin and editor users
 * - Sample songs with lyrics
 * - Sample organizations and groups
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Make sure MONGODB_URI is set in your .env.local
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongodb_1 = require("mongodb");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
// Load env from .env.local
var dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env.local' });
var uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
var dbName = process.env.MONGODB_DB_NAME || 'gracemusic';
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var client, db, passwordHash, users, adminId, editorId, songs, song1Id, song2Id, orgs, org1Id, org2Id, grps, group1Id, group2Id, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = new mongodb_1.MongoClient(uri, {
                        serverApi: { version: mongodb_1.ServerApiVersion.v1, strict: true, deprecationErrors: true }
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 17, 18, 20]);
                    return [4 /*yield*/, client.connect()];
                case 2:
                    _a.sent();
                    console.log('Connected to MongoDB');
                    db = client.db(dbName);
                    // Clear existing data
                    return [4 /*yield*/, db.collection('users').deleteMany({})];
                case 3:
                    // Clear existing data
                    _a.sent();
                    return [4 /*yield*/, db.collection('songs').deleteMany({})];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, db.collection('organizations').deleteMany({})];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, db.collection('groups').deleteMany({})];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, db.collection('messages').deleteMany({})];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, db.collection('genres').deleteMany({})];
                case 8:
                    _a.sent();
                    console.log('Cleared existing data');
                    return [4 /*yield*/, bcryptjs_1.default.hash('password123', 10)];
                case 9:
                    passwordHash = _a.sent();
                    return [4 /*yield*/, db.collection('users').insertMany([
                            {
                                email: 'admin@example.com',
                                name: 'Admin User',
                                username: 'admin',
                                displayName: 'Admin User',
                                photoURL: '',
                                passwordHash: passwordHash,
                                role: 'admin',
                                createdAt: new Date(),
                            },
                            {
                                email: 'editor@example.com',
                                name: 'Editor User',
                                username: 'editor',
                                displayName: 'Editor User',
                                photoURL: '',
                                passwordHash: passwordHash,
                                role: 'editor',
                                createdAt: new Date(),
                            },
                        ])];
                case 10:
                    users = _a.sent();
                    adminId = users.insertedIds[0].toString();
                    editorId = users.insertedIds[1].toString();
                    console.log("Created users: admin (".concat(adminId, "), editor (").concat(editorId, ")"));
                    return [4 /*yield*/, db.collection('songs').insertMany([
                            {
                                title: 'Living Hope',
                                artist: 'Phil Wickham',
                                genre: 'Worship',
                                lyrics: "[G]How great the [D]chasm that [Em]lay between us\n[C]How high the [G]mountain I [D]could not climb\n[G]In despera[D]tion I [Em]turned to heaven\n[C]And spoke Your [G]name into [D]the night\n\n[G]Then through the [D]darkness Your [Em]loving kindness\n[C]Tore through the [G]shadows of [D]my soul\n[G]The work is [D]finished the [Em]end is written\n[C]Jesus [G]Christ my [D]living hope",
                                createdBy: adminId,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                originalKey: 'G',
                            },
                            {
                                title: 'Way Maker',
                                artist: 'Sinach',
                                genre: 'Worship',
                                lyrics: "[E]You are here [B]moving in our midst\n[C#m]I worship [A]You I worship You\n[E]You are here [B]working in this place\n[C#m]I worship [A]You I worship You\n\n[E]Way maker [B]miracle worker\n[C#m]Promise keeper [A]light in the darkness\n[E]My God [B]that is [C#m]who You [A]are",
                                createdBy: editorId,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                originalKey: 'E',
                            },
                        ])];
                case 11:
                    songs = _a.sent();
                    song1Id = songs.insertedIds[0].toString();
                    song2Id = songs.insertedIds[1].toString();
                    console.log("Created songs: Living Hope (".concat(song1Id, "), Way Maker (").concat(song2Id, ")"));
                    return [4 /*yield*/, db.collection('organizations').insertMany([
                            {
                                name: 'Grace North',
                                description: 'Grace North Church',
                                members: [adminId, editorId],
                                groups: [],
                                createdBy: adminId,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                            {
                                name: 'Grace Central',
                                description: 'Grace Central Church',
                                members: [adminId, editorId],
                                groups: [],
                                createdBy: editorId,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                        ])];
                case 12:
                    orgs = _a.sent();
                    org1Id = orgs.insertedIds[0].toString();
                    org2Id = orgs.insertedIds[1].toString();
                    console.log("Created organizations: Grace North (".concat(org1Id, "), Grace Central (").concat(org2Id, ")"));
                    return [4 /*yield*/, db.collection('groups').insertMany([
                            {
                                name: 'Sunday Worship',
                                description: 'Main Sunday worship set',
                                organizationId: org1Id,
                                members: [adminId, editorId],
                                songs: [song1Id, song2Id],
                                songTranspositions: [],
                                createdBy: adminId,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                            {
                                name: 'Youth Service',
                                description: 'Youth worship set',
                                organizationId: org2Id,
                                members: [editorId],
                                songs: [song2Id],
                                songTranspositions: [],
                                createdBy: editorId,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                        ])];
                case 13:
                    grps = _a.sent();
                    group1Id = grps.insertedIds[0].toString();
                    group2Id = grps.insertedIds[1].toString();
                    // Update organizations with group references
                    return [4 /*yield*/, db.collection('organizations').updateOne({ _id: orgs.insertedIds[0] }, { $set: { groups: [group1Id] } })];
                case 14:
                    // Update organizations with group references
                    _a.sent();
                    return [4 /*yield*/, db.collection('organizations').updateOne({ _id: orgs.insertedIds[1] }, { $set: { groups: [group2Id] } })];
                case 15:
                    _a.sent();
                    console.log("Created groups and linked to organizations");
                    // --- Genres ---
                    return [4 /*yield*/, db.collection('genres').insertMany([
                            { name: 'Worship', createdAt: new Date() },
                            { name: 'Hymn', createdAt: new Date() },
                            { name: 'Gospel', createdAt: new Date() },
                            { name: 'Contemporary', createdAt: new Date() },
                        ])];
                case 16:
                    // --- Genres ---
                    _a.sent();
                    console.log('Created genres');
                    console.log('\n✅ Seed completed successfully!');
                    console.log('\nTest accounts:');
                    console.log('  admin@example.com / password123 (admin)');
                    console.log('  editor@example.com / password123 (editor)');
                    return [3 /*break*/, 20];
                case 17:
                    error_1 = _a.sent();
                    console.error('Seed error:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 20];
                case 18: return [4 /*yield*/, client.close()];
                case 19:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 20: return [2 /*return*/];
            }
        });
    });
}
seed();
