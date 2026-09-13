# Chemical Potential Lab

Independent browser prototype for ternary bulk chemical-potential stability diagrams and DFT defect formation-energy workflows. Start with SrTiO3 or Ba3V2O8, then replace all illustrative data with a consistent phase dataset.

## Use

1. Enter the target formula and energy. Formulas encode explicit stoichiometries; parentheses and fractional counts are supported (e.g. Ba3(VO4)2).
2. Choose formation energies/enthalpies or DFT total energies. Each row independently supports eV per entered formula, eV per atom, or eV per cell. For cell energies, enter the number of the **entered formulas** in that cell. Changing the basis reinterprets the entered number rather than converting it.
3. Total energies require elemental reference energies in eV/atom. For O, supply half the consistently calculated O2 energy, including any chosen reference correction. Formation-energy mode can optionally use references to report absolute chemical potentials.
4. Add every relevant competing phase, including binary and ternary compounds and polymorphs. Unchecked phases are excluded; elemental precipitation constraints remain included.
5. Assign each element to the X, Y, and Z axes. All six orderings are supported; assigning an occupied element swaps the two axes. In 2D, Z is eliminated using the host equality. Axis changes preserve the selected physical condition when the inputs are current. Calculate after editing phase data. Click the shaded region or a vertex, or enter the two independent chemical potentials numerically. The vertex table also supports keyboard operation.
6. Export a selected condition or all vertices to CSV, the chart to SVG, and the complete input session to JSON. Open session restores a saved JSON session. Files are processed in the browser; no data storage or analysis service is involved. Save before closing the page.

The SrTiO3 and Ba3V2O8 example energies are invented solely to exercise the geometry; the explicitly labeled ZnSb2O4 presets use the published HSE values described below. The initial phase lists are not established exhaustive phase sets for these materials. The app does not supply validated thermodynamic data.

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

Run `node --test engine.test.mjs plot3d.test.mjs faces3d.test.mjs display.test.mjs` for the scientific regression suite. It checks analytic SrTiO3 vertices, Ba3V2O8 stoichiometry, invariance under axis elimination, total-energy and per-atom normalization, original 3D inequalities and host conservation, instability, polymorphs, duplicates, degenerate intersections, validation, and 50 seeded feasible ternary systems.

CSV exports include the energy provenance flag, target formula, all Δμ values, supplied references, absolute μ when references are available, and active boundaries. Session exports additionally preserve the full phase dataset and normalization settings. Save both the session and condition CSV for reproducibility.

The page optionally exposes two WebMCP tools (`read_stability_diagram` and `select_chemical_potential_point`) when supported by the browser. They use the same state and validation as the UI.

See `docs/chesta-inspection.md` for the limited workflow inspection. No Chesta executable, proprietary code, sample data, translation strings, or visual assets are included in this project.

## 3D view

Switch to **3D → Host + competing-phase faces**. The default 3D view computes every phase face from the current target and enabled competitor inputs. It works for any ternary system accepted by the solver, including the SrTiO3, Ba3V2O8, and ZnSb2O4 examples. Recalculate after changing energies or phase inclusion.

`faces3d.mjs` independently clips each equilibrium plane against the inequalities of **all** included phases, including the host, and the elemental limits. The resulting facets are the boundary of the intersection of the no-precipitation half-spaces. The host facet is pink and matches the 2D solver's stability polygon. Binary, ternary, and elemental competitors receive separate colors; redundant or unstable phases need not have a finite face. Coplanar duplicate entries are grouped. No proprietary Chesta code or assets are used.

These surfaces can extend indefinitely toward negative chemical potentials. **Display ranges** supplies an automatic window around the host or custom minimum and maximum Δμ for each element. The box only clips the view: it is never used to calculate the host's stability limits, and artificial box faces are never drawn as physical phases. A message identifies when custom bounds clip the host. The full host vertex table remains available. Range settings follow elements when axes are swapped.

Drag to rotate, use rotation/tilt/zoom sliders, or press arrow and +/− keys with the plot focused. All axes share the same eV scale. Faces are drawn in depth order, with hidden labels and markers suppressed. Click the pink host face or a host vertex to select the defect condition. Clicking another visible face reports all three chemical potentials in a separate inspector; these points generally do not satisfy host equilibrium, so they do not overwrite the host defect condition. Ray/face picking selects the nearest visible physical surface. **Host polygon only** retains the original plane view, including its optional full host plane.

SVG exports the current calculated view with its faces and labels. JSON sessions preserve axes, 3D display mode, display bounds, camera, and selected host condition; older sessions remain compatible. Reset view changes only the camera, and Auto ranges clears custom display bounds.

Regression checks compare the 3D host facet with the independently solved 2D vertices for every example and all six axis permutations. They also check phase-plane conservation, every original inequality, changed/disabled phases, clipped views, duplicates, unstable hosts, point picking and occlusion, and equivalence of formation, per-atom, and raw total-cell energy inputs.

## ZnSb2O4 paper reconstruction

Two published-HSE presets reproduce the Fig. 1 topology from Charoenphon et al., PCCP 25, 19116-19125 (2023), DOI 10.1039/D3CP01470C. Both use the Table 2 HSE alpha=0.48 formation enthalpies in eV per formula: ZnO -3.35, Sb2O3 -6.82, Sb2O5 -10.28. Other Table 2 phases contain extrinsic dopants and do not constrain the undoped Zn-Sb-O ternary.

The host is absent from Table 2. Table 1 gives -10.25 eV while the main text gives -10.43 eV. Both are provided explicitly, with no silent correction. Table 1 gives O-rich A (Zn,Sb,O)=(-1.660,-0.915,-1.690) and O-poor B=(-1.050,0,-2.300) eV. The prose host gives A=(-1.750,-1.140,-1.600), B=(-0.990,0,-2.360). Thus the text's O-rich 0 and O-poor -0.79 eV conditions cannot satisfy this phase set. The prose variant gives a visually broader pink region similar to Fig. 1; the plot alone does not uniquely establish which host input was used.

In each case, the rich bound follows from ZnO+Sb2O5: O <= (-13.63-H)/2, and the poor bound from ZnO+Sb metal: O >= (H+3.35)/3. All values are relative potentials. Absolute reference energies are not required for this reconstruction and are left blank in the presets.

`dist/paper/` contains session inputs, full vertex data, and independently calculated 3D-face + 2D-projection SVGs. The static 3D illustrations show faces of the no-precipitation half-spaces clipped to the plotting window (Sb [-3,0], O [-2.8,-1.2], Zn [-3,-0.6] eV), including the host equality face. The window does not clip the four host vertices. The app's interactive 3D phase-faces view now calculates these same surfaces dynamically from arbitrary current inputs; the linked SVGs remain fixed illustrations.

`reproduce_znsb2o4.py` generates the illustrations with NumPy and Matplotlib and independently validates every host-facet vertex against the app solver. The source PDF is neither modified nor bundled. To open the table preset directly, append `?example=ZnSb2O4_HSE_table1` to the app URL; use `ZnSb2O4_HSE_prose` for the alternative.

The **Reference illustrations** button in the paper preset note opens the fixed figure viewer. It is separate from **3D → Host + competing-phase faces**, which calculates live surfaces from the current input system.

## General ternary workflow and plot appearance

**New ternary system** starts from an entered formula and formation energy, with no competing phases inherited from an example. Exactly three distinct elements are required; oxide, chalcogenide, nitride, and other ternaries use the same engine. Add competitors and select their energy bases in the existing workspace. DFT total energies remain supported by switching input mode and entering elemental references. Editing a preset identifies the workspace as Custom system. Formulas may contain parentheses, fractional counts, or pasted Unicode subscript digits, which are normalized before parsing.

**Tick interval** uses one zero-anchored interval on every axis in either plot. Auto selects regular steps; explicit choices include 0.50 eV. Very dense manual intervals are increased uniformly, with the effective interval stated next to the controls. Tick formatting avoids negative zero. **Equal eV scale in 2D** is enabled initially, matching the always-equal physical scales in 3D; switching it off permits the 2D view to fill its rectangular plotting area. This controls geometric scaling separately from tick spacing. Rounded 3D axis extents do not alter the display bounds used to clip physical faces or the host stability calculation.

**Face opacity** changes the polygon fill from 0% to 100% in 2D and both 3D modes. Boundaries stay visible. Transparent faces still pick the nearest physical surface; the host-only view or vertex table remains available to select hidden host conditions. Sessions save opacity, tick interval, and equal-scale preferences, and SVG exports preserve fills and subscript labels. Chemical labels in plots use SVG subscript tspans; headings, phase previews, legends and boundary tables use HTML subscripts. Numeric input fields remain editable plain text.
