import { NextRequest, NextResponse } from "next/server";

// Sample Users Database (Replace with actual DB queries)
let users = [
    { id: "1", name: "John Doe", email: "john@example.com", role: "Admin" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", role: "User" },
];

// GET: Fetch users
export async function GET(req: NextRequest) {
    return NextResponse.json(users);
}

// POST: Add a new user
export async function POST(req: NextRequest) {
    try {
        const { name, email, role } = await req.json();
        if (!name || !email || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const newUser = { id: String(users.length + 1), name, email, role };
        users.push(newUser);

        return NextResponse.json(newUser, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
}

// PUT: Update an existing user
export async function PUT(req: NextRequest) {
    try {
        const { id, name, email, role } = await req.json();
        users = users.map(user => (user.id === id ? { id, name, email, role } : user));

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
}

// DELETE: Remove a user
export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();
        users = users.filter(user => user.id !== id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
