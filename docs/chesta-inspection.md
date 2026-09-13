# Chesta archive inspection

Inspected the attachment named `Chesta 3.4.3.2.zip` retrieved from the referenced conversation. Its originally cited `/mnt/data/` location was replaced by the desktop attachment-preview location supplied by the conversation reader. The archive was read without changing it.

The ten archive entries comprise a Windows executable, Japanese localization resources and an untranslated interface-message catalog, settings, an Excel data-creation wizard, a license PDF, and three sample CSV files. Inspection used the archive listing, interface-message catalog, and Cu–S2–O2 sample CSV structure. The executable was not run, disassembled, or decompiled; the spreadsheet macros were not executed. This is not a runtime review of every Chesta capability.

The interface resources identify a workflow of loading/editing thermodynamic phase data, assigning axes, selecting phases and parameters, changing display settings, examining equilibrium points, and saving diagram or tabular outputs. They also indicate temperature/activity controls and diagram cuts that exceed the requested prototype scope. The sample CSV separates diagram metadata, axis definitions, bounds, reference components, and phase stoichiometry/thermodynamic values.

Useful general workflow concepts implemented independently:

- Phase list with inclusion controls and editable energies.
- Explicit axis selection, specialized to eliminating one target-constrained potential.
- Labeled boundaries and an equilibrium-vertex table.
- Numerical inspection and export of selected conditions.
- Diagram export and reproducible saved sessions.

The new implementation specializes in elemental-reference shifts and DFT energy normalization, not aqueous activity or general temperature-dependent diagrams. The numerical algorithm was derived from the bulk thermodynamic inequalities and written independently. Its datasets are original, explicitly illustrative values. No archive content is redistributed in the app.
