document.addEventListener("DOMContentLoaded", async () => {
    const cardContainer = document.querySelector(".content");

    cardContainer.innerHTML = `
        <div class="loader-container">
            <div class="loader-spinner"></div>
            <div class="loader-text">Loading subjects...</div>
        </div>`;

    try {
        const cookieArray = JSON.parse(sessionStorage.getItem("cookies"));
        if (!cookieArray || !cookieArray.length) {
            console.error("No cookies stored");
            window.location.href = "/login.html";
            return;
        }
        const cookies = cookieArray.join("; ");

        const res = await fetch("/api/main", {
            headers: { cookies, api: "subjects" }
        });

        if (res.status === 401) {
            console.error("Unauthorized");
            window.location.href = "/login.html";
            return;
        }

        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        const data = await res.json();
        if (!data.success) {
            cardContainer.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }

        const subjects = data.subjects;
        if (!subjects.length) {
            cardContainer.innerHTML = "<p>No subjects found.</p>";
            return;
        }

        function getEntityIcon(entity) {
            const subTitle = entity.subTitle || "";
            const lower = subTitle.toLowerCase();
            if (entity.entityType === "PLANNING") return "event_note";
            if (lower.includes("test") || lower.includes("quiz") || lower.includes("checkpoint"))
                return "quiz";
            if (lower.includes("plan")) return "event_note";
            if (lower.includes("assessment")) return "check_circle";
            return "assignment";
        }

        function getEntityLink(entity) {
            if (entity.entityType === "PLANNING") return `/subjects/assignment?id=${entity.planningId}&type=planning`;
            return `/subjects/assignment?id=${entity.id}&type=assignment`;
        }


        // Build UI
        cardContainer.innerHTML = `
            <div class="subject-grid">
                ${subjects.map(subject => {
            const teachers = subject.teachers.map(t => `${t.firstName} ${t.lastName}`).join(", ") || "Unknown";
            const unreadBadge = subject.unreadEntities > 0
                ? `<span class="badge">${subject.unreadEntities}</span>`
                : "";

            return `
                        <div class="subject-card" style="border-top: 4px solid ${subject.color};">
                            <a href="/subjects/subject?id=${subject.id}" class="subject-header">
                                <h3>${subject.subject}</h3>
                                ${unreadBadge}
                            </a>
                            <p class="groups">${subject.groupNames.join(", ")}</p>
                            
                            <div class="entities">
                                ${subject.entities.length > 0
                    ? subject.entities.map(e => `
                                        <a href="${getEntityLink(e)}" class="entity ${e.read ? "read" : "unread"}">
                                            <span class="material-symbols-rounded entity-icon">${getEntityIcon(e)}</span>
                                            <div class="entity-text">
                                                <strong>${e.title}</strong>
                                                <small>${e.subTitle || ""}</small>
                                            </div>
                                        </a>
                                    `).join("")
                    : `
                                        <div class="entity empty">
                                            <span class="material-symbols-rounded entity-icon">event_note</span>
                                            <div class="entity-text">
                                                <strong>There's nothing planned yet</strong>
                                            </div>
                                        </div>
                                    `
                }
                            </div>

                            <div class="subject-footer">
                                <small><strong>Teachers:</strong> ${teachers}</small>
                            </div>
                        </div>
                    `;
        }).join("")}
            </div>
        `;
    } catch (err) {
        console.error("Error loading subjects:", err);
        cardContainer.innerHTML = "<p>Failed to load subjects.</p>";
    }
});
