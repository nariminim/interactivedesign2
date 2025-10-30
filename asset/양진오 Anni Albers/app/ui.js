function createTabs(labels, onSelect) {
  const el = document.getElementById("tabs");
  const tabs = [];
  labels.forEach((lab, i) => {
    const b = document.createElement("div");
    b.className = "tab";
    b.textContent = `${i + 1}. ${lab}`;
    b.addEventListener("click", () => onSelect(i));
    el.appendChild(b);
    tabs.push(b);
  });
  return {
    setActive(i) {
      tabs.forEach((t, idx) => t.classList.toggle("active", idx === i));
    },
  };
}
