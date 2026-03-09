const SUPABASE_URL = "https://dgbgfhzcinlomghohxdq.supabase.co";
const SUPABASE_KEY = "sb_publishable_B8LUkJ_0StXvC5kw_etRWg_SskUXrIK";

(function initDatabase() {
  if (!window.supabase) {
    console.error("Supabase library did not load.");
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  window.db = {
    supabase: client,

    async testConnection() {
      try {
        const { data, error } = await client
          .from("users")
          .select("id")
          .limit(1);

        if (error) {
          console.error("Supabase testConnection error:", error.message);
          return { ok: false, error };
        }

        console.log("Supabase connected successfully.", data);
        return { ok: true, data };
      } catch (err) {
        console.error("Supabase testConnection exception:", err);
        return { ok: false, error: err };
      }
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.db.testConnection();
  });
})();