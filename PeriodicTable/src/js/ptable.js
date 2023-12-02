
export const periodicTable = [
    ["H", "", "", "", "", "","","","","","","","","","","","","","He"],
    ["Li","Be","","","","","","","","","","","","B","C","N","O","F","Ne"],
    ["Na","Mg","","","","","","","","","","","","Al","Si","P","S","Sl","Ar"],
    "K Ca - Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr".split(" "),
    "Rb Sr - Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe".split(" "),
    "Cs Ba Lanthanides Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn".split(" "),
    "Fr RA Actinides Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" "),
    ];
let Lanthanides = "La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb".split(" ");
let Actinides = "Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No".split(" ");

export const info4symbol = {
    "H": {
        "name": "Hydrogen",
        "symbol": "H",
        "standard_conditions_state": "gas",
        "appearance": "colorless gas",
        "atomic_number": 1,
        "atomic_weight": 1.008,
        "block": "s-block",
        "group": "group 1: hydrogen and alkali metals",
        "electron_configuration": "1s^1",
        "interesting_fact": "Hydrogen is the main fuel used by the Sun and other stars. They don't burn hydrogen - they use nuclear fusion turning it into helium and releasing great energy.",
        "historical_story": "Being the lightest element, Hydrogen was used for airships, until the Hindenberg trans-atlantic airship exploded."
    },
    "He": {
        "name": "Helium",
        "symbol": "He",
        "standard_conditions_state": "gas",
        "appearance": "colorless gas",
        "atomic_number": 2,
        "atomic_weight": 4.0026,
        "block": "s-block",
        "group": "group 18: noble gases",
        "electron_configuration": "1s^2",
        "interesting_fact": "Helium is the second lightest and second most abundant element in the observable universe.",
        "historical_story": "Helium was first discovered in the solar spectrum by Jules Janssen during a solar eclipse in 1868."
    },
    "Li": {
        "name": "Lithium",
        "symbol": "Li",
        "standard_conditions_state": "solid",
        "appearance": "silvery-white metal",
        "atomic_number": 3,
        "atomic_weight": 6.94,
        "block": "s-block",
        "group": "group 1: hydrogen and alkali metals",
        "electron_configuration": "1s^2 2s^1",
        "interesting_fact": "Lithium is the lightest metal and the least dense solid element under standard conditions.",
        "historical_story": "Lithium was discovered by Johan August Arfwedson in 1817 during an analysis of petalite ore."
    }
    // Additional elements would follow in similar structure
};
