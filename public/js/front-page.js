// js/front-page.js

// Ensure GSAP and ScrollTrigger plugins are registered
gsap.registerPlugin(ScrollTrigger);

/**
 * Animates the elements in the Hero Section on initial page load.
 * Includes text slide-in and floating card animations.
 */
function animateHero() {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Animate hero content (title, subtitle, CTA button)
    tl.from(".hero-title", { y: 50, opacity: 0, duration: 1.2 })
      .from(".hero-subtitle", { y: 30, opacity: 0, duration: 1, delay: -0.8 })
      .from(".cta-button", { y: 20, opacity: 0, duration: 0.8, delay: -0.6 });


    // Animate floating cards (initial slide-in and continuous float)
    const floatingCards = gsap.utils.toArray(".floating-card");

    // Initial slide-in animation for cards (staggered)
    gsap.from(floatingCards, {
        x: 100,
        opacity: 0,
        scale: 0.8,
        duration: 1.5,
        ease: "power3.out",
        stagger: 0.2,
        delay: 0.5
    });

    // Continuous floating animation for cards (looping)
    gsap.to(floatingCards, {
        y: -15,
        repeat: -1,
        yoyo: true,
        duration: 4,
        ease: "sine.inOut",
        stagger: {
            each: 0.7,
            from: "random",
        },
    });
}

// THIS IS THE CORRECTED VERSION FOR ONE-CARD-AT-A-TIME PINNING
function setupFeatureFocusScroll() {
    const featuresContainer = document.querySelector(".features-container"); // Changed from featuresSection to featuresContainer
    const featureCards = gsap.utils.toArray(".feature-card");
    const numCards = featureCards.length;

    if (!featuresContainer || numCards === 0) { // Check featuresContainer
        console.warn("Features container or cards not found for focus scroll animation. Skipping setup.");
        return;
    }

    // Set initial state for all cards using gsap.set (applies immediately, before timeline starts)
    // Cards start fully transparent, scaled down, and slightly offset.
    gsap.set(featureCards, {
        autoAlpha: 0,         // Handles opacity and visibility:hidden
        scale: 0.8,
        xPercent: -50,        // For transform: translate(-50%, -50%) equivalent
        yPercent: -50,
        y: 40                 // Start slightly below their centered position
    });

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: featuresContainer,    // Trigger is the container
            pin: featuresContainer,        // Pin the container itself
            scrub: 0.5,
            start: "top top",
            end: () => `+=${numCards * 300}`, // Each card gets 300px of scroll for its cycle (adjust as needed)
            invalidateOnRefresh: true,
        }
    });

    featureCards.forEach((card, index) => {
        const slotDuration = 1; 
        const cardInTime = index * slotDuration;
        const animationEffectDuration = 0.4;

        tl.to(card, {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: animationEffectDuration,
            ease: "power2.out"
        }, cardInTime);

        tl.to(card, {
            autoAlpha: 0,
            scale: 0.8,
            y: -40, 
            duration: animationEffectDuration,
            ease: "power2.in"
        }, cardInTime + (slotDuration - animationEffectDuration) );
    });
}


/**
 * Sets up general scroll-triggered fade-in/slide-up animations for various sections.
 */
function setupScrollAnimations() {
    gsap.utils.toArray(".section-title").forEach(title => {
        if (!title.closest('.features-section')) {
            gsap.from(title, {
                y: 50,
                autoAlpha: 0,
                duration: 1,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: title,
                    start: "top 80%",
                }
            });
        }
    });

    gsap.utils.toArray(".benefit-item").forEach((item, i) => {
        gsap.from(item, {
            y: 50,
            autoAlpha: 0,
            duration: 0.8,
            delay: i * 0.1,
            ease: "power2.out",
            scrollTrigger: {
                trigger: item,
                start: "top 85%",
            }
        });
    });

    gsap.utils.toArray(".testimonial-card").forEach((card, i) => {
        gsap.from(card, {
            y: 50,
            autoAlpha: 0,
            duration: 0.8,
            delay: i * 0.15,
            ease: "power2.out",
            scrollTrigger: {
                trigger: card,
                start: "top 85%",
            }
        });
    });

    const ctaTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".cta-section",
            start: "top 75%",
        }
    });
    ctaTl.from(".cta-content h2", { y: 50, autoAlpha: 0, duration: 1, ease: "power3.out" })
         .from(".cta-content p", { y: 50, autoAlpha: 0, duration: 1, ease: "power3.out" }, "-=0.7")
         .from(".cta-section .cta-button", { y: 50, autoAlpha: 0, duration: 1, ease: "power3.out" }, "-=0.7");
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        animateHero();
        setupFeatureFocusScroll();
        setupScrollAnimations();
        ScrollTrigger.refresh();
    }, 100);
});

let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        ScrollTrigger.refresh();
    }, 250);
});