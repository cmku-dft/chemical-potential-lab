# Chemical Potential Lab

Independent browser prototype for ternary bulk chemical-potential stability diagrams and DFT defect formation-energy workflows. Start with SrTiO3 or Ba3V2O8, then replace all illustrative data with a consistent phase dataset.

## Use

1. Enter the target formula and energy. Formulas encode explicit stoichiometries; parentheses and fractional counts are supported (e.g. Ba3(VO4)2).
2. Choose formation energies/enthalpies or DFT total energies. Each row independently supports eV per entered formula, eV per atom, or eV per cell. For cell energies, enter the number of the **entered formulas** in that cell. Changing the basis reinterprets the entered number rather than converting it.
3. Total energies require elemental reference energies in eV/atom. For O, supply half the consistently calculated O2 energy, including any chosen reference correction. Formation-energy mode can optionally use references to report absolute chemical potentials.
4. Add every relevant competing phase, including binary and ternary compounds and polymorphs. Unchecked phases are excluded; elemental precipitation constraints remain included.
5. Assign each element to the X, Y, and Z axes. All six orderings are supported; assigning an occupied element swaps the two axes. In 2D, Z is eliminated using the host equality. Axis changes preserve the selected physical condition when the inputs are current. Calculate after editing phase data. Click the shaded region or a vertex, or enter the two independent chemical potentials numerically. The vertex table also supports keyboard operation.
6. Export a selected condition or all vertices to CSV, the chart to SVG, and the complete input session to JSON. Open session restores a saved JSON session. Files are processed in the browser; no data storage or analysis service is involved. Save before closing the page.

All example energies are invented solely to exercise the geometry. The initial phase lists are not established exhaustive phase sets for these materials. The app does not supply validated thermodynamic data.

## Equations and implementation

With target composition (a,b,c), formation energy H, x=ΔμA and y=ΔμB:

    ΔμC = (H − a x − b y) / c

A competitor with composition (p,q,r) and formation energy K gives:

    (p − r a/c) x + (q − r b/c) y ≤ K − r H/c

Every elemental Δμ is constrained to be ≤ 0. The engine intersects pairs of boundary lines, retains points satisfying all half-planes, deduplicates them, and computes the convex hull. The elemental constraints bound the feasible target plane, so no arbitrary plotting box is used to determine feasibility. The plotting viewport is chosen only after solving. Parallel boundaries, redundant rows, constant constraints, empty regions, and zero-area point/line equilibria are handled explicitly. Floating-point feasibility tolerance is 1e-8 times the host chemical-potential scale after normalizing nonconstant constraints. Near-degenerate results within this tolerance should be treated as marginal, not as evidence for a physical stability window.

All chemical potentials are eV/atom. Formation energies are normalized internally to eV per entered formula, which need not be reduced. In total-energy mode:

    H = Ecell / formula_units_per_cell − Σ nᵢ μᵢ⁰

For defects, with nᵢ positive for added atoms:

    Ef = Edefect − Ehost − Σ nᵢ(μᵢ⁰ + Δμᵢ) + q(EF + EVBM) + Ecorr

Use consistent functionals, pseudopotentials, U parameters, and correction schemes. This prototype does not discover competing phases, parse VASP files, compute charge corrections or defect formation-energy curves, convert oxygen potential to pressure/temperature, or model finite-temperature free energies. A feasible region is conditional on the entered competitors, not a proof of global stability.

Background: [Materials Project chemical-potential diagrams](https://docs.materialsproject.org/methodology/materials-methodology/thermodynamic-stability/chemical-potential-diagrams-cpds).

## Files and local development

The independent calculation engine is `dist/engine.mjs`; the interface is `dist/app.mjs`, `dist/index.html`, and `dist/style.css`. No build step or dependency installation is required. Serve `dist` over HTTP, for example `python3 -m http.server 8765 --directory dist`, and open localhost:8765. ES modules require an HTTP server rather than opening index.html directly.

Run `node --test engine.test.mjs plot3d.test.mjs` for the scientific regression suite. It checks analytic SrTiO3 vertices, Ba3V2O8 stoichiometry, invariance under axis elimination, total-energy and per-atom normalization, original 3D inequalities and host conservation, instability, polymorphs, duplicates, degenerate intersections, validation, and 50 seeded feasible ternary systems.

CSV exports include the energy provenance flag, target formula, all Δμ values, supplied references, absolute μ when references are available, and active boundaries. Session exports additionally preserve the full phase dataset and normalization settings. Save both the session and condition CSV for reproducibility.

The page optionally exposes two WebMCP tools (`read_stability_diagram` and `select_chemical_potential_point`) when supported by the browser. They use the same state and validation as the UI.

See `docs/chesta-inspection.md` for the limited workflow inspection. No Chesta executable, proprietary code, sample data, translation strings, or visual assets are included in this project.

## 3D view

Switch from 2D to 3D above the diagram. The same allowed polygon is embedded in (ΔμX, ΔμY, ΔμZ) space on the target equilibrium plane; it is not a three-dimensional stability volume. Drag to rotate, adjust rotation/tilt/zoom sliders, or use arrow and +/− keys with the plot focused. Reset view restores the initial camera. The optional full host plane shows the host equality restricted by elemental limits, with competing-phase intersections. Turning it off focuses the view on the allowed region.

Click a 3D vertex or the shaded plane to inspect chemical potentials. Picking uses the inverse orthographic projection onto the host plane, then the same feasibility check as 2D. Edge-on views reject ambiguous plane picks. All axes share one physical eV scale. CSV values are independent of camera and axis order; SVG exports the active view. Sessions save the axis order, view, camera, and selected condition, while older 2D sessions remain compatible.

The additional projection tests cover all six axis permutations in both examples, point picking at varied camera angles, equal axis scales, edge-on ambiguity, and rendering of empty and degenerate regions.
