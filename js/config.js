// Supabase Configuration
const supabaseUrl = 'https://mdkhvsvkqlhtikhpkwkf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ka2h2c3ZrcWxodGlraHBrd2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTM1NTAsImV4cCI6MjA4MDgyOTU1MH0.zabhAeKeIVAU8YTKmOHcEJf0vYCKJUrS9-RgkRg14ZY';

// Initialize Client
// We use 'supabaseClient' to avoid conflict with the 'supabase' global from the CDN library
window.supabaseClient = null;

if (window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase Client initialized as window.supabaseClient');
} else {
    console.error('❌ Supabase SDK not found. Make sure to include the script tag.');
}