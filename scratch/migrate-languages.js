require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function migrateLanguages() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  
  if (!uri || !dbName) {
    console.error("Missing DB credentials in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(dbName);
    const collection = db.collection('songs');
    
    const songs = await collection.find({}).toArray();
    let updatedCount = 0;

    for (const song of songs) {
      // Normalize genre field
      let genres = [];
      if (Array.isArray(song.genre)) {
        genres = song.genre;
      } else if (typeof song.genre === 'string') {
        genres = song.genre.split(',').map(g => g.trim()).filter(Boolean);
      }

      let language = 'English'; // Default fallback
      const languageMatchRegexes = [
        { regex: /hindi/i, name: 'Hindi' },
        { regex: /malayalam/i, name: 'Malayalam' },
        { regex: /english/i, name: 'English' }
      ];

      // Find if any genre matches a language, prioritize Hindi > Malayalam > English
      let foundLanguage = false;
      const newGenres = [];

      for (const genre of genres) {
        let isLanguageGenre = false;
        for (const lang of languageMatchRegexes) {
          if (lang.regex.test(genre)) {
            if (!foundLanguage) {
              language = lang.name;
              foundLanguage = true;
            }
            isLanguageGenre = true;
            break; // skip checking other languages for this genre
          }
        }
        
        if (!isLanguageGenre) {
          newGenres.push(genre);
        }
      }

      // If the song already has a language defined, we might want to respect it,
      // but since we are adding the field now, it probably doesn't have it.
      if (song.language && !foundLanguage) {
        language = song.language;
      }

      await collection.updateOne(
        { _id: song._id },
        { 
          $set: { 
            language: language,
            genre: newGenres // always set to array format to normalize DB
          } 
        }
      );
      
      updatedCount++;
    }

    console.log(`Successfully migrated ${updatedCount} songs.`);
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await client.close();
  }
}

migrateLanguages();
