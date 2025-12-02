/**
 * Ownership Validation Middleware
 *
 * Wraps AgentX handler to enforce user ownership of resources.
 * Uses Container.config.ownerId to link users with containers.
 */

import type { AgentXHandler } from "agentxjs/server";
import type { AgentX } from "agentxjs";

/**
 * Extract userId from Hono context (set by auth middleware)
 */
function getUserId(request: Request): string | null {
  // This is a workaround - ideally we'd get userId from context
  // But Web Standard Request doesn't have context
  // So we rely on the fact that auth middleware already validated the token
  // and we can re-extract it here
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Check query param for SSE
    const url = new URL(request.url);
    const queryToken = url.searchParams.get("token");
    if (!queryToken) {
      return null;
    }
  }
  // Note: We'll need to decode JWT again here, or pass userId via custom header
  // For now, we'll use a simpler approach: Add X-User-Id header in auth middleware
  return request.headers.get("X-User-Id");
}

/**
 * Create ownership validation wrapper for AgentX handler
 *
 * Enforces:
 * - Container.config.ownerId must match current user
 * - Session.userId must match current user (AgentX already has this)
 *
 * @param agentx - AgentX instance
 * @param baseHandler - Original AgentX handler
 * @returns Wrapped handler with ownership validation
 */
export function createOwnershipHandler(agentx: AgentX, baseHandler: AgentXHandler): AgentXHandler {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Extract userId from request
    const userId = getUserId(request);
    if (!userId) {
      // If no userId, let base handler reject with 401
      return baseHandler(request);
    }

    // ============================================================================
    // Container ownership validation
    // ============================================================================

    // POST /containers - Set ownerId on creation
    if (method === "POST" && path.endsWith("/containers")) {
      // Intercept container creation to inject ownerId
      try {
        const body = await request.json();
        const config = body.config || {};
        config.ownerId = userId; // Inject ownerId

        // Create new request with modified body, preserving all original fields
        const modifiedBody = { ...body, config };
        const modifiedRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(modifiedBody),
        });

        return baseHandler(modifiedRequest);
      } catch {
        return baseHandler(request);
      }
    }

    // PUT /containers/:id - Upsert semantics (create or update)
    const putContainerMatch = path.match(/\/containers\/([^/]+)$/);
    if (method === "PUT" && putContainerMatch) {
      const containerId = putContainerMatch[1];

      const existingContainer = await agentx.containers.get(containerId);

      if (existingContainer) {
        // Update: validate ownership
        const ownerId = (existingContainer.config as Record<string, unknown>)?.ownerId;
        if (ownerId && ownerId !== userId) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        return baseHandler(request);
      } else {
        // Create: inject ownerId into the request body
        try {
          const body = await request.json();
          const config = body.config || {};
          config.ownerId = userId;

          const modifiedBody = { ...body, config };
          const modifiedRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(modifiedBody),
          });

          return baseHandler(modifiedRequest);
        } catch {
          return baseHandler(request);
        }
      }
    }

    // GET /containers/:id - Validate ownership
    const getContainerMatch = path.match(/\/containers\/([^/]+)$/);
    if (method === "GET" && getContainerMatch) {
      const containerId = getContainerMatch[1];

      // Check ownership before allowing access
      const container = await agentx.containers.get(containerId);
      if (!container) {
        return new Response(JSON.stringify({ error: "Container not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const ownerId = (container.config as Record<string, unknown>)?.ownerId;
      if (ownerId && ownerId !== userId) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      return baseHandler(request);
    }

    // DELETE /containers/:id - Validate ownership
    const deleteContainerMatch = path.match(/\/containers\/([^/]+)$/);
    if (method === "DELETE" && deleteContainerMatch) {
      const containerId = deleteContainerMatch[1];

      const container = await agentx.containers.get(containerId);
      if (!container) {
        return new Response(JSON.stringify({ error: "Container not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const ownerId = (container.config as Record<string, unknown>)?.ownerId;
      if (ownerId && ownerId !== userId) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      return baseHandler(request);
    }

    // GET /containers - Filter by ownerId
    if (method === "GET" && path.endsWith("/containers")) {
      const response = await baseHandler(request);

      // Filter response to only show user's containers
      if (response.ok) {
        const body = await response.json();
        if (Array.isArray(body)) {
          const filtered = body.filter((container: { config?: { ownerId?: string } }) => {
            const ownerId = container.config?.ownerId;
            return !ownerId || ownerId === userId; // Show if no owner or owned by user
          });

          return new Response(JSON.stringify(filtered), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      return response;
    }

    // ============================================================================
    // Session ownership validation (already handled by AgentX via userId)
    // ============================================================================

    // For Sessions, AgentX already filters by userId in Session.userId field
    // So we don't need additional validation here

    // ============================================================================
    // Agent ownership validation (via containerId)
    // ============================================================================

    // Agents belong to Containers, so we validate Container ownership
    // TODO: Add agent ownership validation if needed

    // ============================================================================
    // Default: Pass through to base handler
    // ============================================================================

    return baseHandler(request);
  };
}
