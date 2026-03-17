import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...payload } = await req.json();

    switch (action) {
      case "list": {
        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("*, user_roles(role)")
          .order("created_at", { ascending: true });
        if (error) throw error;

        // Get emails from auth.users
        const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();
        const emailMap = new Map(authUsers.map(u => [u.id, u.email]));

        const result = profiles?.map(p => ({
          ...p,
          email: emailMap.get(p.user_id) || "",
          role: p.user_roles?.[0]?.role || "user",
        }));

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create": {
        const { username, fullName, phone, email, password, nationalId, role, active } = payload;
        if (!username || !email || !password) {
          return new Response(JSON.stringify({ error: "Username, email, and password are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create auth user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { username, full_name: fullName },
        });
        if (createError) throw createError;

        // Update profile with extra fields
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            username,
            full_name: fullName || "",
            phone: phone || "",
            national_id: nationalId || "",
            active: active !== false,
          })
          .eq("user_id", newUser.user.id);
        if (profileError) throw profileError;

        // Assign role
        if (role === "admin") {
          await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user.id, role: "admin" });
        }

        return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        const { userId, username, fullName, phone, email, password, nationalId, role, active } = payload;
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update auth user if email or password changed
        const authUpdate: Record<string, string> = {};
        if (email) authUpdate.email = email;
        if (password && password !== "••••••") authUpdate.password = password;
        if (Object.keys(authUpdate).length > 0) {
          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate);
          if (authErr) throw authErr;
        }

        // Update profile
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            username: username || undefined,
            full_name: fullName || "",
            phone: phone || "",
            national_id: nationalId || "",
            active: active !== false,
          })
          .eq("user_id", userId);
        if (profileError) throw profileError;

        // Update role
        if (role) {
          await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
          if (role === "admin") {
            await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const { userId } = payload;
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (userId === caller.id) {
          return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteErr) throw deleteErr;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
