# MechaPurse - Crypto Walletless Wallet

MechaPurse is a next-generation cryptocurrency wallet purpose-built for the Cardano network. It aims to fundamentally transform how digital treasuries are managed, accessed, and governed by combining the performance and finality of Hedera with the unprecedented security guarantees of TideCloak’s decentralized Identity, Immunity, and Access Management (IIAM) system. The MechaPurse platform allows DAOs, foundations, and blockchain-native communities to manage treasuries, distribute funds, and delegate responsibilities - all while eliminating the possibility of unauthorized access, internal compromise, or governance abuse. It also pioneers a fully-integrated, decentralized identity and authorization system (TideCloak's BYOiD and Quorum-Enforced Authorization), making it the first verifiably tamperproof treasury management system.

Unlike traditional wallets or key management systems, MechaPurse requires no wallet downloads, no plugins, and no key storage. Every user interaction is protected and authorized via TideCloak’s decentralized cryptographic fabric, ensuring access can only occur through zero-knowledge authentication and quorum-approved governance - with no key ever held or managed by any party.

MechaPurse is more than a tool; it's a statement about how digital governance and financial systems can be built correctly from the ground up - decentralized, secure, and truly trustless.

## Installation

This is a NextJS project and can be run on any NPM version above 8.4.0. To run this project, you must have a working TideCloak server running with a licensed realm.

To save you from the complexities of setting it up yourself, we suggest using the Github Codespaces deployment provided here:

## Overview

The MechaPurse platform includes the following key modules:

1. Identity & Access Governance (Secured by TideCloak)
   * BYOiD (Bring Your Own Identity) zero-knowledge authentication.
   * Role-based access control with dynamic thresholds for sensitive actions.
   * Governance rules enforced via Quorum-Enforced Authorization: a cryptographically secured, multi-admin policy approval mechanism.
2. Treasury Management Suite
   * Native support for ADA tokens.
   * Fund distribution and transfer approval workflows.
   * Configurable transaction rules (e.g. over-limit requires governance).
3. Community & Governance Layer
   * Community roles: viewer, disburser, approver.
   * Proposal module: create, review and approve spend proposals below defined limits.
   * Verifiable spending governance enforcement.
4. Admin Interface 
   * Self-sovereign admin and user onboarding flows.
   * Full IIAM management portal (using TideCloak)
   * Integrated with TideCloak’s API

## Groundbreaking Value

1. Verifiably Secure Treasury Operations

   Unlike existing treasury tools that rely on centralized IAM or multisig wallets, MechaPurse is the first treasury system to ensure that no one - not even developers or platform admins - can act outside of quorum-approved rules.

3. Keyless and Frictionless by Design

   MechaPurse is fully keyless: no wallets, no extensions, no seed phrases. Users authenticate through ubiquitous web-based decentralized zero-knowledge authentication - enabling secure access without any traditional key management overhead or user burden.

2. True Zero Trust on Cardano

   MechaPurse implements True Zero Trust infrastructure on Cardano, using Ineffable Cryptography to eliminate trust dependencies entirely. It replaces “blindly trusted administrators” with cryptographically provable consensus and math-based enforcement.

3. Self-Sovereign, Composable Identity Framework

   MechaPurse integrates Tide BYOiD, a user-centric, decentralized authentication mechanism that offers Hedera applications a privacy-preserving identity system that requires no change to the user experience, no centralized authentication, and no platform-side secrets to secure.

4. Eliminates the Need for Central Admins or Root Privileges

   Every configuration or authorization change must be approved by a quorum of decentralized administrators. No individual or insider - developer, vendor, or admin - can override the system, even with full backend access.

## Impact for Cryptocurrency Ecosystems

* Enterprise Adoption: MechaPurse makes secure, compliant treasury infrastructure accessible to enterprises who need guaranteed security and auditability.
* Developer Empowerment: MechaPurse is not only a platform - it's an extensible backend. Builders can integrate its capabilities into any dApp.
•	Ecosystem Leadership: MechaPurse positions the underlying chain secure, governance-first crypto finance infrastructure.

## TL;DR

MechaPurse isn’t just a web app. It’s infrastructure. It represents the future of how blockchain-native communities, projects, and DAOs interact with capital - with complete transparency, zero administrative trust, and provable integrity. It elevates cryptocurrency in the enterprise and consumer space, serving as a model of how modern, secure Web3 systems should be built. With the community's support, MechaPurse can define the standard for secure treasury infrastructure on the most performant DLT in existence.

