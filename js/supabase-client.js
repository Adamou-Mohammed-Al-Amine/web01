// js/supabase-client.js
//
// Loads the Supabase JS SDK from a CDN (no build step needed) and creates
// a single shared client. Keys are fetched from our own /api/config
// serverless function, which reads them from environment variables —
// they are never hardcoded in this file or committed to the repo.
//
// Every Supabase call the app makes lives here, so pages/UI code never
// talk to Supabase directly.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let clientPromise = null;

export function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const res = await fetch("/api/config");
      if (!res.ok) {
        throw new Error(
          "Could not load Supabase config from /api/config. Check your environment variables."
        );
      }
      const { supabaseUrl, supabaseAnonKey } = await res.json();
      return createClient(supabaseUrl, supabaseAnonKey);
    })();
  }
  return clientPromise;
}

// ---- creators -----------------------------------------------------------

export async function fetchAllCreators() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchCreatorNames() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from("creators").select("creator_name");
  if (error) throw error;
  return data.map((r) => r.creator_name.trim().toLowerCase());
}

export async function insertCreators(rows) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from("creators").insert(rows).select();
  if (error) throw error;
  return data;
}

export async function updateCreator(id, updates) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("creators")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCreator(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("creators").delete().eq("id", id);
  if (error) throw error;
}

// ---- creator_events (timeline) ------------------------------------------

export async function fetchEvents(creatorId) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("creator_events")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchRecentEvents(limit = 10) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("creator_events")
    .select("*, creators(creator_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function addEvent(creatorId, eventType, label) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("creator_events")
    .insert({ creator_id: creatorId, event_type: eventType, label });
  if (error) throw error;
}

// ---- notifications --------------------------------------------------------

export async function fetchNotifications() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

export async function createNotification(creatorId, type, message) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("notifications")
    .insert({ creator_id: creatorId, type, message });
  if (error) throw error;
}

export async function markNotificationRead(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
  if (error) throw error;
}

// ---- settings (single row) ------------------------------------------------

export async function fetchSettings() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export async function updateSettings(updates) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("settings")
    .update(updates)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return data;
}
