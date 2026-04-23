# PocketHive Orchestrator Debug MCP Server

This is a small [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that lets an MCP-enabled client
talk directly to:

- the PocketHive Orchestrator REST API, and
- the RabbitMQ control-plane exchange (control messages `signal.*` / `event.*` on `ph.control`).

It is designed for debugging and inspection, not for production use.

This directory is copied from PocketHive as reference for the feedback loop extraction.

