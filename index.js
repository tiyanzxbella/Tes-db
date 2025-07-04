require('dotenv').config();
const fs = require('fs');
const { Octokit } = require('@octokit/rest');

// Konfigurasi
const config = {
  githubToken: process.env.GITHUB_TOKEN, // Simpan di file .env
  owner: 'username-github-anda', // Ganti dengan username GitHub Anda
  repo: 'nama-repository', // Ganti dengan nama repository Anda
  dbFile: 'phone_numbers.json' // Nama file database
};

// Inisialisasi Octokit
const octokit = new Octokit({ auth: config.githubToken });

// Database sederhana untuk nomor telepon
class PhoneNumberDatabase {
  constructor() {
    this.numbers = [];
    this.loadFromGitHub();
  }

  // Menambahkan nomor baru
  async addNumber(phoneNumber, name, additionalInfo = {}) {
    const newEntry = {
      id: Date.now().toString(),
      phoneNumber,
      name,
      ...additionalInfo,
      createdAt: new Date().toISOString()
    };
    
    this.numbers.push(newEntry);
    await this.saveToGitHub();
    return newEntry;
  }

  // Menghapus nomor berdasarkan ID
  async removeNumber(id) {
    this.numbers = this.numbers.filter(entry => entry.id !== id);
    await this.saveToGitHub();
  }

  // Mencari nomor
  findNumber(query) {
    return this.numbers.filter(entry => 
      entry.phoneNumber.includes(query) || 
      entry.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Memuat database dari GitHub
  async loadFromGitHub() {
    try {
      const response = await octokit.repos.getContent({
        owner: config.owner,
        repo: config.repo,
        path: config.dbFile
      });

      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      this.numbers = JSON.parse(content);
      console.log('Database loaded from GitHub');
    } catch (error) {
      if (error.status === 404) {
        console.log('Database file not found, starting with empty database');
        this.numbers = [];
      } else {
        console.error('Error loading database:', error.message);
      }
    }
  }

  // Menyimpan database ke GitHub
  async saveToGitHub() {
    try {
      let sha = null;
      
      // Cek apakah file sudah ada untuk mendapatkan SHA
      try {
        const response = await octokit.repos.getContent({
          owner: config.owner,
          repo: config.repo,
          path: config.dbFile
        });
        sha = response.data.sha;
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      const content = JSON.stringify(this.numbers, null, 2);
      const contentEncoded = Buffer.from(content).toString('base64');

      await octokit.repos.createOrUpdateFileContents({
        owner: config.owner,
        repo: config.repo,
        path: config.dbFile,
        message: 'Update phone number database',
        content: contentEncoded,
        sha: sha || undefined
      });

      console.log('Database saved to GitHub');
    } catch (error) {
      console.error('Error saving database:', error.message);
    }
  }
}

// Contoh penggunaan
(async () => {
  const db = new PhoneNumberDatabase();
  
  // Tunggu sebentar untuk memastikan database selesai dimuat
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Tambahkan nomor contoh
  await db.addNumber('+6281234567890', 'John Doe', { type: 'mobile' });
  await db.addNumber('+622187654321', 'Jane Smith', { type: 'office' });
  
  // Cari nomor
  const results = db.findNumber('John');
  console.log('Search results:', results);
  
  // Hapus nomor (contoh)
  // await db.removeNumber('123456789'); // Ganti dengan ID yang valid
})();
