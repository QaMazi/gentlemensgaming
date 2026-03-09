const SUPABASE_URL = "https://dgbgfhzcinlomghohxdq.supabase.co";
const SUPABASE_KEY = "sb_publishable_B8LUkJ_0StXvC5kw_etRWg_SskUXrIK";

(function initDatabase() {
  if (!window.supabase) {
    console.error("Supabase library did not load.");
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  async function getAuthUser() {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  }

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
    },

    async getCurrentAuthUser() {
      return getAuthUser();
    },

    async getOrCreateUserRecord() {
      const authUser = await getAuthUser();
      if (!authUser) return null;

      const meta = authUser.user_metadata || {};

      const discordId =
        meta.provider_id ||
        meta.sub ||
        authUser.id;

      const username =
        meta.preferred_username ||
        meta.full_name ||
        meta.name ||
        meta.user_name ||
        authUser.email ||
        "Unknown User";

      const avatar =
        meta.avatar_url ||
        meta.picture ||
        "";

      const role =
        String(discordId) === String(window.ggAuth?.ADMIN_DISCORD_ID)
          ? "admin"
          : "player";

      const payload = {
        auth_user_id: authUser.id,
        discord_id: String(discordId),
        username,
        avatar,
        role
      };

      const { data, error } = await client
        .from("users")
        .upsert(payload, { onConflict: "discord_id" })
        .select()
        .single();

      if (error) {
        console.error("getOrCreateUserRecord error:", error.message);
        throw error;
      }

      return data;
    },

    async getActiveSession() {
      const { data, error } = await client
        .from("game_sessions")
        .select("*")
        .eq("is_current", true)
        .maybeSingle();

      if (error) {
        console.error("getActiveSession error:", error.message);
        throw error;
      }

      if (data) return data;

      const fallback = await client
        .from("game_sessions")
        .select("*")
        .order("last_used_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallback.error) {
        console.error("getActiveSession fallback error:", fallback.error.message);
        throw fallback.error;
      }

      return fallback.data || null;
    },

    async loadSessionPlayers(sessionId) {
      const { data, error } = await client
        .from("session_players")
        .select(`
          id,
          session_id,
          user_id,
          seat_no,
          status,
          is_ready,
          joined_at,
          left_at,
          users:user_id (
            id,
            discord_id,
            username,
            avatar,
            role
          )
        `)
        .eq("session_id", sessionId)
        .eq("status", "joined")
        .order("seat_no", { ascending: true });

      if (error) {
        console.error("loadSessionPlayers error:", error.message);
        throw error;
      }

      return data || [];
    },

    async joinSessionLobby(sessionId) {
      const { data, error } = await client.rpc("join_session_lobby", {
        p_session_id: sessionId
      });

      if (error) {
        console.error("joinSessionLobby error:", error.message);
        throw error;
      }

      return data;
    },

    async leaveSessionLobby(sessionId) {
      const { data, error } = await client.rpc("leave_session_lobby", {
        p_session_id: sessionId
      });

      if (error) {
        console.error("leaveSessionLobby error:", error.message);
        throw error;
      }

      return data;
    },

    async toggleReady(sessionId, ready = null) {
      const { data, error } = await client.rpc("toggle_session_ready", {
        p_session_id: sessionId,
        p_ready: ready
      });

      if (error) {
        console.error("toggleReady error:", error.message);
        throw error;
      }

      return data;
    },

    async createNewSession({ name, description = "", maxPlayers = 6 }) {
      const { data, error } = await client.rpc("create_game_session", {
        p_name: name,
        p_description: description,
        p_max_players: maxPlayers
      });

      if (error) {
        console.error("createNewSession error:", error.message);
        throw error;
      }

      return data;
    },

    async switchActiveSession(sessionId) {
      const { data, error } = await client.rpc("switch_current_session", {
        p_session_id: sessionId
      });

      if (error) {
        console.error("switchActiveSession error:", error.message);
        throw error;
      }

      return data;
    },

    async getSessionActivity(sessionId, limit = 20) {
      const { data, error } = await client
        .from("activity_feed")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("getSessionActivity error:", error.message);
        throw error;
      }

      return data || [];
    },

    async getMyPlayerState(sessionId) {
      const userRecord = await this.getOrCreateUserRecord();
      if (!userRecord) return null;

      const { data, error } = await client
        .from("player_state")
        .select("*")
        .eq("session_id", sessionId)
        .eq("user_id", userRecord.id)
        .maybeSingle();

      if (error) {
        console.error("getMyPlayerState error:", error.message);
        throw error;
      }

      return data;
    },

    subscribeToLobby(sessionId, onChange) {
      const channel = client
        .channel(`session-lobby-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "session_players",
            filter: `session_id=eq.${sessionId}`
          },
          onChange
        )
        .subscribe();

      return () => client.removeChannel(channel);
    },

    subscribeToActivity(sessionId, onChange) {
      const channel = client
        .channel(`session-activity-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "activity_feed",
            filter: `session_id=eq.${sessionId}`
          },
          onChange
        )
        .subscribe();

      return () => client.removeChannel(channel);
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.db.testConnection();
  });
})();