import { ReactNode } from "react";
import { FaChevronRight } from "react-icons/fa";
import styles from "@/styles/AdminDashboard.module.css";

interface CollapsibleSectionProps {
    title: ReactNode;
    expanded: boolean;
    onToggle: () => void;
    headerActions?: ReactNode;
    children: ReactNode;
}

const CollapsibleSection = ({
    title,
    expanded,
    onToggle,
    headerActions,
    children,
}: CollapsibleSectionProps) => {
    return (
        <div className={styles.collapsibleSection}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderLeft}>
                    <button onClick={onToggle} className={styles.expandButton} title="Toggle Expand/Collapse">
                        <FaChevronRight className={expanded ? styles.iconRotated : ""} />
                    </button>
                    {typeof title === "string" ? <h3 className={styles.sectionTitle}>{title}</h3> : title}
                </div>
                {headerActions && headerActions}
            </div>
            <div className={`${styles.collapsibleContent} ${expanded ? styles.expanded : styles.collapsed}`}>
                {children}
            </div>
        </div>
    );
};

export default CollapsibleSection;
