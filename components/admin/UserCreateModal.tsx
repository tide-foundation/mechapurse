"use client";

import { useState } from "react";
import styles from "@/styles/AdminDashboard.module.css";

interface UserCreateModalProps {
    onClose: () => void;
    onCreate: (newUser: {
        username: string;
        firstName: string;
        lastName: string;
        email: string;
    }) => void | Promise<void>;
}

const UserCreateModal = ({ onClose, onCreate }: UserCreateModalProps) => {
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate({ username, firstName, lastName, email });
    };

    return (
        <div
            className={styles.modalOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="userCreateModalTitle"
        >
            <div className={`${styles.appCard} ${styles.userModalCard}`}>
                <h3 id="userCreateModalTitle" className={styles.modalTitle}>
                    Add New User
                </h3>
                <p className={styles.modalSubtitle}>
                    Enter the new user's details.
                </p>
                <form onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Username</label>
                        <input
                            type="text"
                            className={styles.inputField}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>First Name</label>
                        <input
                            type="text"
                            className={styles.inputField}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Last Name</label>
                        <input
                            type="text"
                            className={styles.inputField}
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email</label>
                        <input
                            type="email"
                            className={styles.inputField}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.modalActions}>
                        <button type="button" onClick={onClose} className={styles.secondaryButton}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.primaryButton}>
                            Add User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserCreateModal;
